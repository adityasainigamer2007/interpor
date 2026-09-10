import type { Metadata } from "next";

import { PasswordForm } from "@/components/account/PasswordForm";
import { SessionList } from "@/components/account/SessionList";
import { PageHeader } from "@/components/ui/Page";
import { requireAuth } from "@/lib/auth/guards";
import { activeSessionsFor } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, session } = await requireAuth();
  const sessions = activeSessionsFor(user.id);

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Security"
        title="Account settings"
        description="Your password and the devices signed in to your account."
      />

      <div className="split">
        <div className="stack g-5" style={{ minWidth: 0 }}>
          <section className="panel rise">
            <div className="panel-head">
              <div className="stack g-1">
                <h3>Password</h3>
                <span className="t-xs faint">Changing it signs out every other device.</span>
              </div>
            </div>
            <div className="panel-body">
              <PasswordForm />
            </div>
          </section>

          <section className="panel rise">
            <div className="panel-head">
              <div className="stack g-1">
                <h3>Active devices</h3>
                <span className="t-xs faint">
                  {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
            <div className="panel-body">
              <SessionList sessions={sessions} currentId={session.id} />
            </div>
          </section>
        </div>

        <aside className="panel rise">
          <div className="panel-head">
            <h3 style={{ fontSize: "var(--step-0)" }}>How your account is secured</h3>
          </div>
          <div className="panel-body stack g-4">
            {[
              ["Passwords", "Hashed with scrypt and a per-account salt. We can't read yours, and neither can anyone with the database."],
              ["Sessions", "A signed, HTTP-only cookie that JavaScript can't touch. Sessions expire after 30 days."],
              ["Email codes", "Six digits, stored as a digest, valid for 15 minutes, six attempts."],
              ["Rate limiting", "Repeated failed sign-ins are throttled per account."],
            ].map(([title, body]) => (
              <div key={title} className="stack g-1">
                <span className="t-sm medium">{title}</span>
                <span className="t-xs muted" style={{ lineHeight: 1.6 }}>
                  {body}
                </span>
              </div>
            ))}

            <hr className="rule" />
            <div className="row between g-3">
              <span className="t-xs faint">Member since</span>
              <span className="t-sm">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
