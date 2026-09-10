import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import { read, mutate, id, now } from "../db/store";
import { type PublicUser, type Role, ROLE_RANK, type Session, type User, toPublicUser } from "../db/schema";
import { signSessionId, unsignSessionId } from "./crypto";

export const SESSION_COOKIE = "ayava_session";
const SESSION_DAYS = 30;

export interface Auth {
  user: PublicUser;
  session: Session;
}

/* ---------- Reading the current session ---------- */

/**
 * The current signed-in user, or null.
 *
 * Wrapped in React's `cache` so the many server components that ask for it
 * during a single render share one lookup.
 */
export const auth = cache(async (): Promise<Auth | null> => {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const sessionId = unsignSessionId(raw);
  if (!sessionId) return null;

  const db = read();
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session || session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.status === "suspended") return null;

  return { user: toPublicUser(user), session };
});

/** Convenience: just the user. */
export async function currentUser(): Promise<PublicUser | null> {
  return (await auth())?.user ?? null;
}

export function hasRole(user: { role: Role } | null | undefined, minimum: Role): boolean {
  if (!user) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}

/* ---------- Creating and ending sessions ---------- */

async function requestContext(): Promise<{ ip: string; userAgent: string; device: string }> {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "Unknown client";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "127.0.0.1";
  return { ip, userAgent, device: describeDevice(userAgent) };
}

/** A short, human label for the session list in Settings — "Chrome on macOS". */
export function describeDevice(ua: string): string {
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";

  const os =
    /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Windows/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown OS";

  return `${browser} on ${os}`;
}

export async function createSession(userId: string): Promise<Session> {
  const ctx = await requestContext();
  const created = now();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();

  const session: Session = {
    id: id("sess"),
    userId,
    createdAt: created,
    expiresAt: expires,
    lastActiveAt: created,
    userAgent: ctx.userAgent,
    ip: ctx.ip,
    device: ctx.device,
    revokedAt: null,
  };

  mutate((db) => {
    db.sessions.push(session);
    const user = db.users.find((u) => u.id === userId);
    if (user) user.lastSignInAt = created;
    // Housekeeping: drop sessions that expired more than a week ago.
    const cutoff = Date.now() - 7 * 86_400_000;
    db.sessions = db.sessions.filter((s) => new Date(s.expiresAt).getTime() > cutoff);
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, signSessionId(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });

  return session;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const sessionId = unsignSessionId(raw);
    if (sessionId) {
      mutate((db) => {
        const s = db.sessions.find((x) => x.id === sessionId);
        if (s) s.revokedAt = now();
      });
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Revoke one session by id — used by "sign out of this device". */
export function revokeSession(sessionId: string, userId: string): boolean {
  return mutate((db) => {
    const s = db.sessions.find((x) => x.id === sessionId && x.userId === userId);
    if (!s) return false;
    s.revokedAt = now();
    return true;
  });
}

/** Revoke every session for a user except, optionally, the one in hand. */
export function revokeAllSessions(userId: string, exceptId?: string): number {
  return mutate((db) => {
    let count = 0;
    for (const s of db.sessions) {
      if (s.userId === userId && !s.revokedAt && s.id !== exceptId) {
        s.revokedAt = now();
        count += 1;
      }
    }
    return count;
  });
}

export function activeSessionsFor(userId: string): Session[] {
  return read()
    .sessions.filter(
      (s) => s.userId === userId && !s.revokedAt && new Date(s.expiresAt).getTime() > Date.now(),
    )
    .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
}

/* ---------- Audit ---------- */

export async function recordAudit(
  action: string,
  target: string,
  meta: Record<string, string> = {},
  actor?: { id: string; email: string } | null,
): Promise<void> {
  const who = actor ?? (await auth())?.user ?? null;
  const ctx = await requestContext();
  mutate((db) => {
    db.audit.unshift({
      id: id("aud"),
      actorId: who?.id ?? null,
      actorEmail: who?.email ?? "anonymous",
      action,
      target,
      meta,
      ip: ctx.ip,
      createdAt: now(),
    });
    if (db.audit.length > 1000) db.audit.length = 1000;
  });
}

/** Look up the raw user record. Server-side only — carries the password hash. */
export function findUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return read().users.find((u) => u.email === normalized);
}
