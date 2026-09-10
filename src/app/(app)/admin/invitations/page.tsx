import type { Metadata } from "next";

import { InviteForm } from "@/components/admin/InviteForm";
import { RevokeInviteButton } from "@/components/admin/RevokeInviteButton";
import { RoleBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireRole } from "@/lib/auth/guards";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { readOutbox } from "@/lib/mail";
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
  const outbox = readOutbox(8);

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

          {/* The dev mailbox — this is where invitation links actually land. */}
          <section className="panel rise">
            <div className="panel-head">
              <div className="stack g-1">
                <h3>Dev outbox</h3>
                <span className="t-xs faint">
                  No mail is sent in development. Invitation and code emails land here and in the server console.
                </span>
              </div>
              <Icon.mail size={18} />
            </div>

            {outbox.length ? (
              <div className="panel-body stack g-4">
                {outbox.map((message, i) => (
                  <div key={`${message.sentAt}-${i}`} className="stack g-2">
                    <div className="row between g-3 wrap">
                      <span className="t-sm medium truncate">{message.subject}</span>
                      <span className="t-xs faint nowrap">{formatDateTime(message.sentAt)}</span>
                    </div>
                    <span className="t-xs faint">to {message.to}</span>
                    {message.actionUrl ? (
                      <a
                        href={message.actionUrl}
                        className="link t-xs mono truncate"
                        style={{ display: "block" }}
                      >
                        {message.actionUrl}
                      </a>
                    ) : null}
                    {i < outbox.length - 1 ? <hr className="rule" /> : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Outbox is empty" description="Send an invitation and it'll appear here." />
            )}
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
