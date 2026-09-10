"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { read, mutate, id, now } from "../db/store";
import type { CodePurpose, Role, User } from "../db/schema";
import { formError, formSuccess, isEmail, str, type FormState } from "../forms";
import { sendInvitation, sendPasswordReset, sendVerificationCode } from "../mail";
import {
  generateCode,
  hashPassword,
  hmac,
  randomToken,
  safeEqual,
  validatePassword,
  verifyPassword,
} from "./crypto";
import { humanizeSeconds, clearLimit, rateLimit } from "./rate-limit";
import {
  auth,
  createSession,
  endSession,
  findUserByEmail,
  recordAudit,
  revokeAllSessions,
  SESSION_COOKIE,
} from "./session";

/**
 * Credential flows: sign-in, sign-up, email verification, password reset,
 * invitation acceptance and sign-out.
 *
 * Every action returns a `FormState` so the client forms can drive
 * `useActionState`, except where the flow ends in a redirect.
 */

const CODE_TTL_MS = 15 * 60 * 1000;
const CODE_MAX_ATTEMPTS = 6;
const INVITE_TTL_MS = 14 * 86_400_000;

const AVATAR_COLORS = ["#c9a227", "#8f7bd6", "#5b9dc0", "#5da37c", "#c07a5b", "#a4788f"];

function pickColor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/** Where a user belongs immediately after authenticating. */
function landingFor(user: Pick<User, "status">, redirectUrl?: string): string {
  if (user.status === "pending") return "/pending";
  if (redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) return redirectUrl;
  return "/dashboard";
}

/* ---------- One-time codes ---------- */

function issueCode(userId: string, purpose: CodePurpose): string {
  const code = generateCode();
  mutate((db) => {
    // Only one live code per purpose — issuing a new one retires the old.
    for (const c of db.codes) {
      if (c.userId === userId && c.purpose === purpose && !c.consumedAt) c.consumedAt = now();
    }
    db.codes.push({
      id: id("vc"),
      userId,
      purpose,
      codeHash: hmac(`${purpose}:${code}`),
      expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
      attempts: 0,
      consumedAt: null,
      createdAt: now(),
    });
    if (db.codes.length > 500) db.codes.splice(0, db.codes.length - 500);
  });
  return code;
}

type CodeCheck = { ok: true } | { ok: false; reason: string };

function consumeCode(userId: string, purpose: CodePurpose, code: string): CodeCheck {
  return mutate((db) => {
    const record = [...db.codes]
      .reverse()
      .find((c) => c.userId === userId && c.purpose === purpose && !c.consumedAt);

    if (!record) return { ok: false as const, reason: "That code has already been used. Request a new one." };
    if (new Date(record.expiresAt).getTime() < Date.now())
      return { ok: false as const, reason: "That code has expired. Request a new one." };
    if (record.attempts >= CODE_MAX_ATTEMPTS) {
      record.consumedAt = now();
      return { ok: false as const, reason: "Too many incorrect attempts. Request a new code." };
    }

    record.attempts += 1;
    if (!safeEqual(record.codeHash, hmac(`${purpose}:${code}`)))
      return { ok: false as const, reason: "That code isn't right. Check it and try again." };

    record.consumedAt = now();
    return { ok: true as const };
  });
}

/* ---------- Sign in ---------- */

export async function signInAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  const password = str(data, "password");
  const redirectUrl = str(data, "redirect_url");
  const values = { email };

  if (!isEmail(email)) return formError("Enter a valid email address.", { email: "Check this address." }, values);
  if (!password) return formError("Enter your password.", { password: "Required." }, values);

  const limit = rateLimit(`signin:${email}`, 8, 15 * 60_000);
  if (!limit.ok)
    return formError(
      `Too many attempts. Try again in ${humanizeSeconds(limit.retryAfterSeconds)}.`,
      undefined,
      values,
    );

  const user = findUserByEmail(email);
  // Identical response whether the account exists or the password is wrong.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    await recordAudit("auth.sign_in_failed", email, {}, null);
    return formError("That email and password don't match.", undefined, values);
  }

  if (user.status === "suspended")
    return formError("This account has been suspended. Contact the studio.", undefined, values);

  clearLimit(`signin:${email}`);

  if (!user.emailVerified) {
    const code = issueCode(user.id, "email_verification");
    sendVerificationCode(user.email, user.firstName, code);
    redirect(`/verify?email=${encodeURIComponent(user.email)}`);
  }

  await createSession(user.id);
  await recordAudit("auth.sign_in", user.email, { role: user.role }, { id: user.id, email: user.email });
  redirect(landingFor(user, redirectUrl));
}

/* ---------- Sign up ---------- */

export async function signUpAction(_prev: FormState, data: FormData): Promise<FormState> {
  const firstName = str(data, "firstName");
  const lastName = str(data, "lastName");
  const email = str(data, "email").toLowerCase();
  const password = str(data, "password");
  const discipline = str(data, "discipline");
  const values = { firstName, lastName, email, discipline };

  const fields: Record<string, string> = {};
  if (!firstName) fields.firstName = "Required.";
  if (!lastName) fields.lastName = "Required.";
  if (!isEmail(email)) fields.email = "Enter a valid email address.";
  const pwError = validatePassword(password);
  if (pwError) fields.password = pwError;
  if (!discipline) fields.discipline = "Pick the closest one.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields, values);

  const limit = rateLimit(`signup:${email}`, 5, 60 * 60_000);
  if (!limit.ok)
    return formError(`Too many attempts. Try again in ${humanizeSeconds(limit.retryAfterSeconds)}.`, undefined, values);

  if (findUserByEmail(email))
    return formError(
      "An account already exists for that email.",
      { email: "Already registered — try signing in." },
      values,
    );

  const created = now();
  const user: User = {
    id: id("usr"),
    email,
    passwordHash: hashPassword(password),
    firstName,
    lastName,
    role: "intern",
    // Applications wait for an admin to activate them — see /pending.
    status: "pending",
    emailVerified: false,
    title: "Intern applicant",
    bio: "",
    avatarColor: pickColor(email),
    discipline,
    cohort: "",
    mentorId: null,
    location: "",
    links: [],
    onboarding: {},
    createdAt: created,
    updatedAt: created,
    lastSignInAt: null,
  };

  mutate((db) => db.users.push(user));
  const code = issueCode(user.id, "email_verification");
  sendVerificationCode(user.email, user.firstName, code);
  await recordAudit("auth.sign_up", user.email, { discipline }, { id: user.id, email: user.email });

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

/* ---------- Verify email ---------- */

export async function verifyEmailAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  const code = str(data, "code").replace(/\s/g, "");

  if (!isEmail(email)) return formError("Something went wrong — start again from sign-in.");
  if (!/^\d{6}$/.test(code)) return formError("Enter the six digits from your email.", { code: "Six digits." });

  const limit = rateLimit(`verify:${email}`, 12, 15 * 60_000);
  if (!limit.ok) return formError(`Too many attempts. Try again in ${humanizeSeconds(limit.retryAfterSeconds)}.`);

  const user = findUserByEmail(email);
  if (!user) return formError("Something went wrong — start again from sign-in.");

  const check = consumeCode(user.id, "email_verification", code);
  if (!check.ok) return formError(check.reason, { code: " " });

  mutate((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (u) {
      u.emailVerified = true;
      u.updatedAt = now();
    }
  });

  await createSession(user.id);
  await recordAudit("auth.email_verified", user.email, {}, { id: user.id, email: user.email });
  redirect(landingFor(user));
}

export async function resendCodeAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  const purpose = (str(data, "purpose") || "email_verification") as CodePurpose;

  const limit = rateLimit(`resend:${email}`, 4, 10 * 60_000);
  if (!limit.ok)
    return formError(`Hold on — you can request another code in ${humanizeSeconds(limit.retryAfterSeconds)}.`);

  const user = findUserByEmail(email);
  if (user) {
    const code = issueCode(user.id, purpose);
    if (purpose === "password_reset") sendPasswordReset(user.email, user.firstName, code);
    else sendVerificationCode(user.email, user.firstName, code);
  }
  // Same answer either way — this endpoint must not confirm who has an account.
  return formSuccess("If that address is registered, a new code is on its way.");
}

/* ---------- Password reset ---------- */

export async function forgotPasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  if (!isEmail(email)) return formError("Enter a valid email address.", { email: "Check this address." }, { email });

  const limit = rateLimit(`forgot:${email}`, 5, 30 * 60_000);
  if (!limit.ok) return formError(`Too many requests. Try again in ${humanizeSeconds(limit.retryAfterSeconds)}.`);

  const user = findUserByEmail(email);
  if (user) {
    const code = issueCode(user.id, "password_reset");
    sendPasswordReset(user.email, user.firstName, code);
    await recordAudit("auth.reset_requested", user.email, {}, { id: user.id, email: user.email });
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  const code = str(data, "code").replace(/\s/g, "");
  const password = str(data, "password");
  const values = { email };

  if (!isEmail(email)) return formError("Something went wrong — request a new link.", undefined, values);
  if (!/^\d{6}$/.test(code)) return formError("Enter the six digits from your email.", { code: "Six digits." }, values);
  const pwError = validatePassword(password);
  if (pwError) return formError(pwError, { password: pwError }, values);

  const limit = rateLimit(`reset:${email}`, 12, 15 * 60_000);
  if (!limit.ok) return formError(`Too many attempts. Try again in ${humanizeSeconds(limit.retryAfterSeconds)}.`, undefined, values);

  const user = findUserByEmail(email);
  if (!user) return formError("Something went wrong — request a new code.", undefined, values);

  const check = consumeCode(user.id, "password_reset", code);
  if (!check.ok) return formError(check.reason, { code: " " }, values);

  mutate((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (u) {
      u.passwordHash = hashPassword(password);
      u.emailVerified = true;
      u.updatedAt = now();
    }
  });

  // A password change invalidates every existing session.
  revokeAllSessions(user.id);
  await createSession(user.id);
  await recordAudit("auth.password_reset", user.email, {}, { id: user.id, email: user.email });
  redirect(landingFor(user));
}

/* ---------- Invitations ---------- */

export async function createInvitationAction(_prev: FormState, data: FormData): Promise<FormState> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return formError("Only admins can invite people.");

  const email = str(data, "email").toLowerCase();
  const role = (str(data, "role") || "intern") as Role;
  const firstName = str(data, "firstName");
  const lastName = str(data, "lastName");
  const discipline = str(data, "discipline");
  const cohort = str(data, "cohort");
  const mentorId = str(data, "mentorId") || null;

  if (!isEmail(email)) return formError("Enter a valid email address.", { email: "Check this address." });
  if (!["admin", "mentor", "intern"].includes(role)) return formError("Pick a valid role.");
  if (findUserByEmail(email)) return formError("That person already has an account.", { email: "Already registered." });

  const db = read();
  const live = db.invitations.find(
    (i) => i.email === email && !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt).getTime() > Date.now(),
  );
  if (live) return formError("There's already a live invitation for that address. Revoke it first to send another.");

  const token = randomToken(32);
  mutate((d) =>
    d.invitations.push({
      id: id("inv"),
      email,
      role,
      tokenHash: hmac(`invite:${token}`),
      firstName,
      lastName,
      discipline,
      cohort,
      mentorId,
      invitedBy: session.user.id,
      createdAt: now(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      acceptedAt: null,
      revokedAt: null,
    }),
  );

  sendInvitation(email, firstName, session.user.fullName, token);
  await recordAudit("invitation.created", email, { role });
  revalidatePath("/admin/invitations");
  return formSuccess(`Invitation sent to ${email}. The link is in the dev outbox below.`);
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return;

  const email = mutate((db) => {
    const inv = db.invitations.find((i) => i.id === invitationId);
    if (!inv || inv.acceptedAt) return null;
    inv.revokedAt = now();
    return inv.email;
  });

  if (!email) return;
  await recordAudit("invitation.revoked", email);
  revalidatePath("/admin/invitations");
}

export async function acceptInvitationAction(_prev: FormState, data: FormData): Promise<FormState> {
  const token = str(data, "token");
  const firstName = str(data, "firstName");
  const lastName = str(data, "lastName");
  const password = str(data, "password");
  const values = { firstName, lastName };

  const fields: Record<string, string> = {};
  if (!firstName) fields.firstName = "Required.";
  if (!lastName) fields.lastName = "Required.";
  const pwError = validatePassword(password);
  if (pwError) fields.password = pwError;
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields, values);

  const tokenHash = hmac(`invite:${token}`);
  const invitation = read().invitations.find((i) => safeEqual(i.tokenHash, tokenHash));

  if (!invitation || invitation.revokedAt || invitation.acceptedAt)
    return formError("This invitation is no longer valid. Ask the studio for a new one.", undefined, values);
  if (new Date(invitation.expiresAt).getTime() < Date.now())
    return formError("This invitation has expired. Ask the studio for a new one.", undefined, values);
  if (findUserByEmail(invitation.email))
    return formError("An account already exists for that email — try signing in.", undefined, values);

  const created = now();
  const user: User = {
    id: id("usr"),
    email: invitation.email,
    passwordHash: hashPassword(password),
    firstName,
    lastName,
    role: invitation.role,
    // Invited people are vouched for — straight to active.
    status: "active",
    emailVerified: true,
    title: invitation.role === "intern" ? "Intern" : invitation.role === "mentor" ? "Mentor" : "Studio",
    bio: "",
    avatarColor: pickColor(invitation.email),
    discipline: invitation.discipline,
    cohort: invitation.cohort,
    mentorId: invitation.mentorId,
    location: "",
    links: [],
    onboarding: {},
    createdAt: created,
    updatedAt: created,
    lastSignInAt: null,
  };

  mutate((db) => {
    db.users.push(user);
    const inv = db.invitations.find((i) => i.id === invitation.id);
    if (inv) inv.acceptedAt = created;
  });

  await createSession(user.id);
  await recordAudit("invitation.accepted", user.email, { role: user.role }, { id: user.id, email: user.email });
  redirect("/dashboard?welcome=1");
}

/* ---------- Sign out ---------- */

export async function signOutAction(): Promise<void> {
  const session = await auth();
  if (session) await recordAudit("auth.sign_out", session.user.email);
  await endSession();
  redirect("/sign-in");
}

/** Sign out of one listed device. */
export async function revokeSessionAction(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session) return;

  mutate((db) => {
    const target = db.sessions.find((s) => s.id === sessionId && s.userId === session.user.id);
    if (target) target.revokedAt = now();
  });
  await recordAudit("auth.session_revoked", sessionId);
  revalidatePath("/settings");

  // Revoking the session you're using is just a sign-out.
  if (sessionId === session.session.id) {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    redirect("/sign-in");
  }
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const session = await auth();
  if (!session) return;
  const count = revokeAllSessions(session.user.id, session.session.id);
  await recordAudit("auth.sessions_revoked", session.user.email, { count: String(count) });
  revalidatePath("/settings");
}
