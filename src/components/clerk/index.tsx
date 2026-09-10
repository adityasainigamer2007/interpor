import type { ReactNode } from "react";

import { ROLE_RANK, type Role } from "@/lib/db/schema";
import { auth } from "@/lib/auth/session";

/**
 * Clerk-shaped control components.
 *
 * These are the pieces of Clerk's API the portal actually leans on, backed by
 * our own session layer: render-gating by auth state (`SignedIn`/`SignedOut`)
 * and by role (`Protect`). They're async server components, so gating happens
 * before anything reaches the browser rather than being hidden with CSS.
 */

export async function SignedIn({ children }: { children: ReactNode }) {
  const session = await auth();
  return session ? <>{children}</> : null;
}

export async function SignedOut({ children }: { children: ReactNode }) {
  const session = await auth();
  return session ? null : <>{children}</>;
}

export async function Protect({
  role,
  fallback = null,
  children,
}: {
  /** Minimum role required. `mentor` also admits admins. */
  role: Role;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const session = await auth();
  if (!session) return <>{fallback}</>;
  return ROLE_RANK[session.user.role] >= ROLE_RANK[role] ? <>{children}</> : <>{fallback}</>;
}
