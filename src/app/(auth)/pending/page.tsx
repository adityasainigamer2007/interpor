import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Icon } from "@/components/ui/Icons";
import { signOutAction } from "@/lib/auth/actions";
import { auth } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Application received" };
export const dynamic = "force-dynamic";

/** The lobby: a verified account waiting on an admin to activate it. */
export default async function PendingPage() {
  const session = await auth();
  if (!session) redirect("/sign-in");
  if (session.user.status === "active") redirect("/dashboard");

  return (
    <div className="stack g-5">
      <span
        className="row center"
        style={{
          width: 52,
          height: 52,
          borderRadius: 999,
          background: "var(--gold-wash)",
          border: "1px solid rgba(201,162,39,0.35)",
          color: "var(--gold)",
        }}
      >
        <Icon.check size={22} />
      </span>

      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Application received</h1>
        <p className="muted t-sm">
          Thanks, {session.user.firstName}. Your email is verified and your application is with the
          studio. We review applications weekly and you&apos;ll hear from us at{" "}
          <span className="medium" style={{ color: "var(--text)" }}>{session.user.email}</span> either way.
        </p>
      </div>

      <div className="card pad-sm stack g-3">
        <div className="row between g-3">
          <span className="t-xs faint">Discipline</span>
          <span className="t-sm medium">{session.user.discipline || "—"}</span>
        </div>
        <hr className="rule" style={{ margin: 0 }} />
        <div className="row between g-3">
          <span className="t-xs faint">Applied</span>
          <span className="t-sm medium">{formatDate(session.user.createdAt)}</span>
        </div>
        <hr className="rule" style={{ margin: 0 }} />
        <div className="row between g-3">
          <span className="t-xs faint">Status</span>
          <span className="badge warn">
            <i className="dot" /> Awaiting approval
          </span>
        </div>
      </div>

      <form action={signOutAction}>
        <button type="submit" className="btn btn-ghost btn-block">
          Sign out
        </button>
      </form>
    </div>
  );
}
