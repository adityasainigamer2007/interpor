"use server";

import { redirect } from "next/navigation";

import { isUninitialised, mutate, id, now } from "../db/store";
import type { User } from "../db/schema";
import { formError, isEmail, str, type FormState } from "../forms";
import { hashPassword, safeEqual, validatePassword } from "./crypto";
import { createSession, recordAudit } from "./session";

/**
 * First-run setup.
 *
 * With no seed data, a fresh install has nobody who can sign in. This creates
 * the very first administrator — and is deliberately hard to abuse:
 *
 *  - it only works while the database holds zero users, so it seals itself
 *    permanently the moment the first account exists;
 *  - it additionally requires SETUP_TOKEN from the server environment, so
 *    whoever reaches the page first cannot simply claim the studio.
 */

export async function setupRequired(): Promise<boolean> {
  return isUninitialised();
}

export async function setupTokenConfigured(): Promise<boolean> {
  return Boolean(process.env.SETUP_TOKEN && process.env.SETUP_TOKEN.length >= 8);
}

export async function completeSetupAction(_prev: FormState, data: FormData): Promise<FormState> {
  if (!isUninitialised())
    return formError("This portal has already been set up. Sign in instead.");

  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < 8)
    return formError(
      "SETUP_TOKEN is not set on the server. Add it to your environment (at least 8 characters) and restart.",
    );

  const token = str(data, "setupToken");
  const firstName = str(data, "firstName");
  const lastName = str(data, "lastName");
  const email = str(data, "email").toLowerCase();
  const password = str(data, "password");
  const values = { firstName, lastName, email };

  const fields: Record<string, string> = {};
  if (!firstName) fields.firstName = "Required.";
  if (!lastName) fields.lastName = "Required.";
  if (!isEmail(email)) fields.email = "Enter a valid email address.";
  const pwError = validatePassword(password);
  if (pwError) fields.password = pwError;
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields, values);

  if (!token || !safeEqual(token, expected))
    return formError("That setup token doesn't match the one on the server.", {
      setupToken: "Incorrect.",
    }, values);

  const created = now();
  const admin: User = {
    id: id("usr"),
    email,
    passwordHash: hashPassword(password),
    firstName,
    lastName,
    role: "admin",
    status: "active",
    emailVerified: true,
    title: "Studio",
    bio: "",
    avatarColor: "#c9a227",
    discipline: "",
    cohort: "",
    mentorId: null,
    location: "",
    links: [],
    onboarding: {},
    createdAt: created,
    updatedAt: created,
    lastSignInAt: null,
  };

  // Re-check inside the mutation so two simultaneous submissions can't both win.
  const claimed = mutate((db) => {
    if (db.users.length > 0) return false;
    db.users.push(admin);
    return true;
  });
  if (!claimed) return formError("This portal has just been set up by someone else. Sign in instead.");

  await createSession(admin.id);
  await recordAudit("portal.setup_completed", admin.email, { role: "admin" }, {
    id: admin.id,
    email: admin.email,
  });

  redirect("/admin?setup=1");
}
