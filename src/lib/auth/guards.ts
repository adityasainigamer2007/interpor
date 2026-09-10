import "server-only";

import { redirect } from "next/navigation";

import type { PublicUser, Role } from "../db/schema";
import { ROLE_RANK } from "../db/schema";
import { auth, type Auth } from "./session";

/**
 * Route guards. These mirror Clerk's server helpers: `requireAuth()` for any
 * signed-in user, `requireRole()` when a page belongs to mentors or admins.
 * Both redirect rather than throw, so a signed-out visitor lands on sign-in
 * with a `redirect_url` that returns them where they were headed.
 */

export async function requireAuth(returnTo?: string): Promise<Auth> {
  const session = await auth();
  if (!session) {
    const target = returnTo ? `?redirect_url=${encodeURIComponent(returnTo)}` : "";
    redirect(`/sign-in${target}`);
  }
  // A verified account that an admin hasn't activated yet waits in the lobby.
  if (session.user.status === "pending") redirect("/pending");
  return session;
}

export async function requireRole(minimum: Role, returnTo?: string): Promise<Auth> {
  const session = await requireAuth(returnTo);
  if (ROLE_RANK[session.user.role] < ROLE_RANK[minimum]) redirect("/dashboard?denied=1");
  return session;
}

/** Non-redirecting check, for conditionally rendering UI. */
export function can(user: PublicUser | null, minimum: Role): boolean {
  return !!user && ROLE_RANK[user.role] >= ROLE_RANK[minimum];
}
