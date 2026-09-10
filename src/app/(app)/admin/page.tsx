import type { Metadata } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { PageHeader, Progress, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireRole } from "@/lib/auth/guards";
import { formatHours, relativeTime } from "@/lib/format";
import { allUsers, auditTrail, studioStats } from "@/lib/queries";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  await requireRole("admin");

  const stats = studioStats();
  const pending = allUsers().filter((u) => u.status === "pending");
  const recent = auditTrail(8);
  const taskCompletion =
    stats.openTasks + stats.completedTasks > 0
      ? Math.round((stats.completedTasks / (stats.openTasks + stats.completedTasks)) * 100)
      : 0;

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Administration"
        title="Studio overview"
        description="How the programme is running: people, work, hours and everything waiting on a decision."
      />

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Active interns" value={stats.activeInterns} meta={`${stats.totalUsers} accounts in total`} gold />
        </div>
        <div className="card">
          <Stat label="Live projects" value={stats.activeProjects} meta={`${stats.projects} on the books`} />
        </div>
        <div className="card">
          <Stat label="Hours approved" value={formatHours(stats.approvedHours)} meta={`${formatHours(stats.pendingHours)} awaiting`} />
        </div>
        <div className="card">
          <Stat
            label="Average rating"
            value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
            meta="Across reviewed deliverables"
          />
        </div>
      </section>

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Open tasks" value={stats.openTasks} meta={stats.overdueTasks ? `${stats.overdueTasks} overdue` : "None overdue"} />
        </div>
        <div className="card">
          <Stat label="Task completion" value={`${taskCompletion}%`} meta={`${stats.completedTasks} done`} />
          <div style={{ marginTop: 12 }}>
            <Progress value={taskCompletion} />
          </div>
        </div>
        <div className="card">
          <Stat label="Awaiting review" value={stats.pendingSubmissions} meta="Deliverables" />
        </div>
        <div className="card">
          <Stat label="Open invitations" value={stats.openInvitations} meta="Not yet accepted" />
        </div>
      </section>

      {pending.length ? (
        <section className="panel rise">
          <div className="panel-head">
            <div className="stack g-1">
              <h3>Applications waiting on you</h3>
              <span className="t-xs faint">Verified their email, not yet activated.</span>
            </div>
            <Link href="/admin/users?status=pending" className="link t-sm">
              Review all
            </Link>
          </div>
          <div className="panel-body tight">
            {pending.slice(0, 5).map((person) => (
              <div
                key={person.id}
                className="row between g-4 wrap"
                style={{ padding: "14px 22px", borderBottom: "1px solid var(--line-soft)" }}
              >
                <div className="row g-3" style={{ minWidth: 0 }}>
                  <Avatar name={person.fullName} color={person.avatarColor} size="sm" />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <span className="t-sm medium truncate">{person.fullName}</span>
                    <span className="t-xs faint truncate">
                      {person.discipline || "—"} · applied {relativeTime(person.createdAt)}
                    </span>
                  </div>
                </div>
                <Link href={`/admin/users/${person.id}`} className="btn btn-sm btn-ghost">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="split">
        <section className="panel rise">
          <div className="panel-head">
            <h3>Recent activity</h3>
            <Link href="/admin/audit" className="link t-sm">
              Full audit log
            </Link>
          </div>
          <div className="panel-body">
            <div className="timeline">
              {recent.map((event) => (
                <div key={event.id} className="timeline-item done">
                  <p className="t-sm medium">
                    <span className="mono" style={{ color: "var(--gold)" }}>
                      {event.action}
                    </span>{" "}
                    <span className="muted">{event.target}</span>
                  </p>
                  <p className="t-xs faint">
                    {event.actorEmail} · {relativeTime(event.createdAt)}
                  </p>
                </div>
              ))}
              {!recent.length ? <p className="t-sm faint">Nothing logged yet.</p> : null}
            </div>
          </div>
        </section>

        <aside className="stack g-4">
          <section className="panel rise">
            <div className="panel-head">
              <h3 style={{ fontSize: "var(--step-0)" }}>Quick actions</h3>
            </div>
            <div className="panel-body stack g-2">
              {[
                { href: "/admin/users", label: "Manage users", icon: Icon.users },
                { href: "/admin/invitations", label: "Invite someone", icon: Icon.mail },
                { href: "/admin/audit", label: "Audit log", icon: Icon.shield },
                { href: "/announcements", label: "Post an announcement", icon: Icon.megaphone },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="side-link">
                  <action.icon size={17} />
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
