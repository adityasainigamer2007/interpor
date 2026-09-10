import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * Development mail transport.
 *
 * The portal never sends real email — verification codes, invitations and
 * password resets are written to `data/outbox.json` and printed to the server
 * console, so every flow is walkable end to end without an SMTP account.
 * Swap `deliver` for your provider (Resend, Postmark, SES …) to go live; the
 * rest of the codebase only ever calls the named helpers below.
 */

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
  /** Surfaced in the dev console so you can click straight through. */
  actionUrl?: string;
  sentAt: string;
}

const OUTBOX = path.join(path.dirname(dataDir()), "outbox.json");

function dataDir(): string {
  const file = process.env.DATA_FILE
    ? path.resolve(process.env.DATA_FILE)
    : path.join(process.cwd(), "data", "db.json");
  return file;
}

function deliver(message: MailMessage): void {
  try {
    fs.mkdirSync(path.dirname(OUTBOX), { recursive: true });
    const existing: MailMessage[] = fs.existsSync(OUTBOX)
      ? (JSON.parse(fs.readFileSync(OUTBOX, "utf8")) as MailMessage[])
      : [];
    existing.unshift(message);
    fs.writeFileSync(OUTBOX, JSON.stringify(existing.slice(0, 200), null, 2), "utf8");
  } catch {
    // An unwritable outbox must never break a sign-up.
  }

  const rule = "─".repeat(64);
  console.log(
    `\n${rule}\n✉  ${message.subject}\n   to: ${message.to}\n${rule}\n${message.body}` +
      (message.actionUrl ? `\n\n   → ${message.actionUrl}` : "") +
      `\n${rule}\n`,
  );
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function sendVerificationCode(to: string, firstName: string, code: string): void {
  deliver({
    to,
    subject: `${code} is your Ayava verification code`,
    body:
      `Hi ${firstName || "there"},\n\n` +
      `Your Ayava Creatives verification code is ${code}.\n` +
      `It expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
    sentAt: new Date().toISOString(),
  });
}

export function sendPasswordReset(to: string, firstName: string, code: string): void {
  deliver({
    to,
    subject: `${code} — reset your Ayava password`,
    body:
      `Hi ${firstName || "there"},\n\n` +
      `Use the code ${code} to set a new password for the Ayava intern portal.\n` +
      `It expires in 15 minutes. If this wasn't you, nothing has changed on your account.`,
    actionUrl: `${appUrl()}/reset-password?email=${encodeURIComponent(to)}`,
    sentAt: new Date().toISOString(),
  });
}

export function sendInvitation(
  to: string,
  firstName: string,
  invitedBy: string,
  token: string,
): void {
  const url = `${appUrl()}/invite/${token}`;
  deliver({
    to,
    subject: "You're invited to the Ayava Creatives intern portal",
    body:
      `Hi ${firstName || "there"},\n\n` +
      `${invitedBy} has invited you to join the Ayava Creatives intern portal.\n` +
      `Follow the link below to set your password and get started. The invitation expires in 14 days.`,
    actionUrl: url,
    sentAt: new Date().toISOString(),
  });
}

/** Read the dev outbox — used by the admin console to show what was "sent". */
export function readOutbox(limit = 25): MailMessage[] {
  try {
    if (!fs.existsSync(OUTBOX)) return [];
    return (JSON.parse(fs.readFileSync(OUTBOX, "utf8")) as MailMessage[]).slice(0, limit);
  } catch {
    return [];
  }
}
