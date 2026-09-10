import type { Metadata } from "next";

import { InviteForm } from "@/components/admin/InviteForm";
import { RevokeInviteButton } from "@/components/admin/RevokeInviteButton";
import { RoleBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireRole } from "@/lib/auth/guards";
import { formatDate, relativeTime } from "@/lib/format";
import { isSmtpConfigured, mailFrom, readOutbox, verifyMailTransport } from "@/lib/mail";
import { invitations, mentors, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Invitations" };

function stateOf(invite: ReturnType<typeof invitations>[number]) {
  if (invite.acceptedAt) return { label: "Accepted", tone: "ok" as const };
  if (invite.revokedAt) return { label: "Revoked", tone: "danger" as const };
  if (new Date(invite.expiresAt).getTime() < Date.now()) return { label: "Expired", tone: "" as const };
  return { label: "Pending", tone: "warn" as const };
}

export default async function AdminInvitationsPage() {
  await requireRole("admin");

  const list = invitations();
  const people = userMap();
  const smtpOn = isSmtpConfigured();
  const mail = await verifyMailTransport();
  const outbox = smtpOn ? "" : readOutbox();

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Administration"
        title="Invitations"
        description="Invited people skip the application queue — they set a password and land straight in the portal."
      />

      <div className="split">
        <div className="stack g-5" style={{ minWidth: 0 }}>
          <section className="panel rise">
            <div className="panel-head">
              <h3>All invitations</h3>
              <span className="badge tnum">{list.length}</span>
            </div>

            {list.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Invited by</th>
                      <th>State</th>
                      <th>Expires</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((invite) => {
                      const state = stateOf(invite);
                      const inviter = people.get(invite.invitedBy);
                      const live = state.label === "Pending";
                      return (
                        <tr key={invite.id}>
                          <td>
                            <span className="stack">
                              <span className="medium truncate">{invite.email}</span>
                              {invite.firstName ? (
                                <span className="t-xs faint">
                                  {invite.firstName} {invite.lastName}
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td>
                            <RoleBadge role={invite.role} />
                          </td>
                          <td className="muted truncate">{inviter?.firstName ?? "—"}</td>
                          <td>
                            <span className={state.tone ? `badge ${state.tone}` : "badge"}>{state.label}</span>
                          </td>
                          <td className="nowrap muted">
                            {invite.acceptedAt ? `Accepted ${relativeTime(invite.acceptedAt)}` : formatDate(invite.expiresAt)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {live ? <RevokeInviteButton invitationId={invite.id} /> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No invitations sent yet" description="Invite your first mentor or intern on the right." />
            )}
          </section>

          {/* Delivery health — an invitation that cannot be sent is worse than none. */}
          <section className="panel rise">
            <div className="panel-head">
              <div className="stack g-1">
                <h3>Email delivery</h3>
                <span className="t-xs faint">
                  {smtpOn ? `Sending as ${mailFrom()}` : "SMTP is not configured"}
                </span>
              </div>
              <Icon.mail size={18} />
            </div>

            <div className="panel-body stack g-4">
              <div className={mail.ok ? "alert alert-ok" : "alert alert-error"}>
                <span>
                  <strong>{mail.ok ? "Connected." : "Not sending."}</strong> {mail.detail}
                </span>
              </div>

              {!smtpOn ? (
                <>
                  <p className="t-sm muted" style={{ lineHeight: 1.65 }}>
                    Until SMTP is set, verification codes and invitation links are written to the
                    server console and <code className="mono">data/outbox.log</code> instead of being
                    emailed. In production the portal refuses to send rather than failing silently.
                  </p>
                  {outbox ? (
                    <pre
                      className="mono t-xs"
                      style={{
                        margin: 0,
                        padding: 14,
                        maxHeight: 260,
                        overflow: "auto",
                        background: "var(--ink-900)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md)",
                        color: "var(--text-dim)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {outbox}
                    </pre>
                  ) : (
                    <p className="hint">Nothing sent yet.</p>
                  )}
                </>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="panel rise" style={{ position: "sticky", top: 88 }}>
          <div className="panel-head">
            <h3 style={{ fontSize: "var(--step-0)" }}>Send an invitation</h3>
          </div>
          <div className="panel-body">
            <InviteForm mentors={mentors()} />
          </div>
        </aside>
      </div>
    </div>
  );
}
