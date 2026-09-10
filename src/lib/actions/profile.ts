"use server";

import { revalidatePath } from "next/cache";

import { hashPassword, validatePassword, verifyPassword } from "../auth/crypto";
import { requireAuth } from "../auth/guards";
import { recordAudit, revokeAllSessions } from "../auth/session";
import { mutate, now, read } from "../db/store";
import { formError, formSuccess, str, type FormState } from "../forms";
import { ONBOARDING_STEPS } from "../db/schema";
import { safeUrl } from "../format";

export async function updateProfileAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireAuth();

  const firstName = str(data, "firstName");
  const lastName = str(data, "lastName");
  const title = str(data, "title");
  const bio = str(data, "bio");
  const location = str(data, "location");
  const discipline = str(data, "discipline");

  const fields: Record<string, string> = {};
  if (!firstName) fields.firstName = "Required.";
  if (!lastName) fields.lastName = "Required.";
  if (bio.length > 600) fields.bio = "Keep it under 600 characters.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  const links: { label: string; url: string }[] = [];
  for (let i = 0; i < 3; i += 1) {
    const url = str(data, `linkUrl${i}`);
    if (!url) continue;
    const safe = safeUrl(url);
    if (!safe) return formError(`"${url}" isn't a valid http(s) link.`, { [`linkUrl${i}`]: "Check this link." });
    links.push({ label: str(data, `linkLabel${i}`) || new URL(safe).hostname.replace(/^www\./, ""), url: safe });
  }

  mutate((db) => {
    const record = db.users.find((u) => u.id === user.id);
    if (!record) return;
    Object.assign(record, { firstName, lastName, title, bio, location, discipline, links, updatedAt: now() });
    // Filling in a profile ticks the first onboarding step.
    if (bio && discipline) record.onboarding = { ...record.onboarding, profile: true };
  });

  await recordAudit("profile.updated", user.email);
  revalidatePath("/profile");
  revalidatePath("/directory");
  return formSuccess("Profile saved.");
}

export async function changePasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user, session } = await requireAuth();

  const current = str(data, "currentPassword");
  const next = str(data, "newPassword");

  const record = read().users.find((u) => u.id === user.id);
  if (!record) return formError("Something went wrong. Sign in again.");
  if (!verifyPassword(current, record.passwordHash))
    return formError("That isn't your current password.", { currentPassword: "Incorrect." });

  const problem = validatePassword(next);
  if (problem) return formError(problem, { newPassword: problem });
  if (verifyPassword(next, record.passwordHash))
    return formError("Choose a password you haven't used here before.", { newPassword: "Same as the old one." });

  mutate((db) => {
    const target = db.users.find((u) => u.id === user.id);
    if (target) {
      target.passwordHash = hashPassword(next);
      target.updatedAt = now();
    }
  });

  // Everywhere else gets signed out; the device making the change stays in.
  const revoked = revokeAllSessions(user.id, session.id);
  await recordAudit("auth.password_changed", user.email, { revokedSessions: String(revoked) });
  revalidatePath("/settings");

  return formSuccess(
    revoked > 0
      ? `Password updated. ${revoked} other ${revoked === 1 ? "session was" : "sessions were"} signed out.`
      : "Password updated.",
  );
}

export async function toggleOnboardingStepAction(key: string): Promise<void> {
  const { user } = await requireAuth();
  if (!ONBOARDING_STEPS.some((s) => s.key === key)) return;

  mutate((db) => {
    const record = db.users.find((u) => u.id === user.id);
    if (!record) return;
    record.onboarding = { ...record.onboarding, [key]: !record.onboarding[key] };
    record.updatedAt = now();
  });

  revalidatePath("/dashboard");
}
