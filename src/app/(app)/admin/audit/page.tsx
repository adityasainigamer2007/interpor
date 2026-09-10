import type { Metadata } from "next";

import { EmptyState, PageHeader } from "@/components/ui/Page";
import { requireRole } from "@/lib/auth/guards";
import { formatDateTime, relativeTime } from "@/lib/format";
import { auditTrail } from "@/lib/queries";

export const metadata: Metadata = { title: "Audit log" };

/** Colour-code by what the event touched, so scanning is fast. */
function toneFor(action: string): string {
  if (action.startsWith("auth.sign_in_failed") || action.includes("suspended") || action.includes("revoked"))
    return "#dd968c";
  if (action.startsWith("auth.")) return "#9db9d6";
  if (action.startsWith("user.") || action.startsWith("invitation.")) return "var(--gold-hi)";
  return "var(--text-dim)";
}

export default async function AdminAuditPage() {
  await requireRole("admin");

  const events = auditTrail(120);

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Every security-relevant action in the portal: sign-ins, role changes, approvals and invitations."
      />

      <section className="panel rise">
        <div className="panel-head">
          <h3>Recent events</h3>
          <span className="badge tnum">{events.length}</span>
        </div>

        {events.length ? (
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Actor</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td className="nowrap">
                      <span className="stack">
                        <span>{relativeTime(event.createdAt)}</span>
                        <span className="t-xs faint">{formatDateTime(event.createdAt)}</span>
                      </span>
                    </td>
                    <td>
                      <span className="mono t-xs" style={{ color: toneFor(event.action) }}>
                        {event.action}
                      </span>
                      {Object.keys(event.meta).length ? (
                        <span className="t-xs faint" style={{ display: "block", marginTop: 2 }}>
                          {Object.entries(event.meta)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(" · ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="muted truncate" style={{ maxWidth: 240 }}>
                      {event.target}
                    </td>
                    <td className="muted truncate" style={{ maxWidth: 220 }}>
                      {event.actorEmail}
                    </td>
                    <td className="mono t-xs faint nowrap">{event.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nothing logged yet" />
        )}
      </section>
    </div>
  );
}
