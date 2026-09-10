import "server-only";

import fs from "node:fs";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email.
 *
 * In production the portal sends over SMTP and treats a missing or broken
 * configuration as a hard error: a verification code that silently vanishes
 * looks, to the person waiting for it, exactly like a broken product. In
 * development, with no SMTP configured, messages are written to
 * `data/outbox.log` and printed to the console so flows stay walkable.
 */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl?: string;
}

const OUTBOX = path.join(
  path.dirname(
    process.env.DATABASE_FILE
      ? path.resolve(process.env.DATABASE_FILE)
      : path.join(process.cwd(), "data", "portal.db"),
  ),
  "outbox.log",
);

const isProduction = process.env.NODE_ENV === "production";

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

const globalMail = globalThis as unknown as { __ayavaMailer?: Transporter };

function transport(): Transporter {
  if (globalMail.__ayavaMailer) return globalMail.__ayavaMailer;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const created = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  globalMail.__ayavaMailer = created;
  return created;
}

export function mailFrom(): string {
  return (
    process.env.MAIL_FROM ??
    `Ayava Creatives <${process.env.SMTP_USER ?? "portal@ayavacreatives.com"}>`
  );
}

/**
 * Base URL used to build invitation and password-reset links.
 *
 * Prefers the server-only `APP_URL` because `NEXT_PUBLIC_*` values are inlined
 * at **build** time — a production image built without it would email everyone
 * links pointing at localhost. `APP_URL` is read at runtime, so the same build
 * works in staging and production.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production")
      throw new Error(
        "APP_URL is not set. Invitation and password-reset links would point at localhost. " +
          "Set APP_URL to the portal's public https address.",
      );
    return "http://localhost:3000";
  }
  return configured.replace(/\/$/, "");
}

/** Verify the SMTP credentials actually work. Surfaced in the admin console. */
export async function verifyMailTransport(): Promise<{ ok: boolean; detail: string }> {
  if (!smtpConfigured())
    return {
      ok: false,
      detail: "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.",
    };
  try {
    await transport().verify();
    return { ok: true, detail: `Connected to ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}.` };
  } catch (error) {
    return { ok: false, detail: (error as Error).message };
  }
}

async function deliver(message: MailMessage): Promise<void> {
  if (smtpConfigured()) {
    await transport().sendMail({
      from: mailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return;
  }

  if (isProduction) {
    // Never fail silently in production — the caller turns this into a visible error.
    throw new Error(
      "Cannot send email: SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.",
    );
  }

  const entry =
    `\n${"─".repeat(64)}\n[${new Date().toISOString()}] ${message.subject}\n` +
    `to: ${message.to}\n${"─".repeat(64)}\n${message.text}` +
    (message.actionUrl ? `\n\n→ ${message.actionUrl}` : "") +
    `\n${"─".repeat(64)}\n`;

  console.log(entry);
  try {
    fs.mkdirSync(path.dirname(OUTBOX), { recursive: true });
    fs.appendFileSync(OUTBOX, entry, "utf8");
  } catch {
    // An unwritable dev outbox must never break a sign-up.
  }
}

/* ---------- Templates ---------- */

const BRAND = "Ayava Creatives";

function layout(heading: string, body: string, action?: { label: string; url: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#0b0b0c;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#121215;border:1px solid rgba(255,255,255,0.08);border-radius:16px;">
    <tr><td style="padding:32px;">
      <p style="margin:0 0 24px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#c9a227;">${BRAND}</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#f5f2ec;font-weight:600;">${heading}</h1>
      <div style="font-size:15px;line-height:1.65;color:#a8a49e;">${body}</div>
      ${
        action
          ? `<p style="margin:28px 0 0;"><a href="${action.url}" style="display:inline-block;padding:12px 24px;background:#c9a227;color:#16130a;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">${action.label}</a></p>
             <p style="margin:16px 0 0;font-size:12px;color:#6d6862;word-break:break-all;">Or paste this link: ${action.url}</p>`
          : ""
      }
      <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#6d6862;">
        ${BRAND} — Intern Portal. If you weren't expecting this email, you can ignore it.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

function codeBlock(code: string): string {
  return `<p style="margin:20px 0;font-size:32px;letter-spacing:.32em;font-weight:600;color:#f5f2ec;font-family:ui-monospace,Menlo,Consolas,monospace;">${code}</p>`;
}

export async function sendVerificationCode(to: string, firstName: string, code: string): Promise<void> {
  await deliver({
    to,
    subject: `${code} is your ${BRAND} verification code`,
    text: `Hi ${firstName || "there"},\n\nYour ${BRAND} verification code is ${code}.\nIt expires in 15 minutes.\n\nIf you didn't ask for it, you can ignore this email.`,
    html: layout(
      "Confirm your email address",
      `<p style="margin:0;">Hi ${firstName || "there"}, use this code to confirm your email address. It expires in 15 minutes.</p>${codeBlock(code)}`,
    ),
  });
}

export async function sendPasswordReset(to: string, firstName: string, code: string): Promise<void> {
  await deliver({
    to,
    subject: `${code} — reset your ${BRAND} password`,
    text: `Hi ${firstName || "there"},\n\nUse the code ${code} to set a new password for the ${BRAND} intern portal.\nIt expires in 15 minutes.\n\nIf this wasn't you, nothing has changed on your account.`,
    html: layout(
      "Set a new password",
      `<p style="margin:0;">Hi ${firstName || "there"}, use this code to set a new password. It expires in 15 minutes.</p>${codeBlock(code)}<p style="margin:0;">If this wasn't you, nothing has changed on your account.</p>`,
    ),
    actionUrl: `${appUrl()}/reset-password?email=${encodeURIComponent(to)}`,
  });
}

export async function sendInvitation(
  to: string,
  firstName: string,
  invitedBy: string,
  token: string,
): Promise<void> {
  const url = `${appUrl()}/invite/${token}`;
  await deliver({
    to,
    subject: `You're invited to the ${BRAND} intern portal`,
    text: `Hi ${firstName || "there"},\n\n${invitedBy} has invited you to join the ${BRAND} intern portal.\n\nSet your password here: ${url}\n\nThe invitation expires in 14 days.`,
    html: layout(
      "You're invited",
      `<p style="margin:0;">${invitedBy} has invited you to join the ${BRAND} intern portal. Set a password and you're in — the invitation expires in 14 days.</p>`,
      { label: "Accept invitation", url },
    ),
    actionUrl: url,
  });
}

/** Dev-only outbox tail, shown in the admin console when SMTP is unset. */
export function readOutbox(limitBytes = 8000): string {
  try {
    if (!fs.existsSync(OUTBOX)) return "";
    const content = fs.readFileSync(OUTBOX, "utf8");
    return content.length > limitBytes ? content.slice(-limitBytes) : content;
  } catch {
    return "";
  }
}

export function isSmtpConfigured(): boolean {
  return smtpConfigured();
}
