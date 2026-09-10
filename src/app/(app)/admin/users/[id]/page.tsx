import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MentorSelect, RoleSelect, StatusControl } from "@/components/admin/UserControls";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge, TaskStatusBadge, UserStatusBadge } from "@/components/ui/Badges";
import { PageHeader, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireRole } from "@/lib/auth/guards";
import { activeSessionsFor } from "@/lib/auth/session";
import { formatDate, formatHours, relativeTime } from "@/lib/format";
import {
  mentors,
  submissionsFor,
  tasksFor,
  timeEntriesFor,
  totalApprovedHours,
  userById,
} from "@/lib/queries";

export const metadata: Metadata = { title: "User" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole("admin");

  const person = userById(id);
  if (!person) notFound();

  const tasks = tasksFor(person.id);
  const submissions = submissionsFor(person.id);
  const entries = timeEntriesFor(person.id);
  const sessions = activeSessionsFor(person.id);
  const mentor = person.mentorId ? userById(person.mentorId) : null;

  return (
    <div className="stack g-5">
      <Link href="/admin/users" className="link-quiet t-sm row g-2" style={{ width: "fit-content" }}>
        <span style={{ rotate: "180deg", display: "inline-flex" }}>
          <Icon.arrow size={15} />
        </span>
        All users
      </Link>

      <PageHeader eyebrow="Administration" title={person.fullName} description={person.email} />

      <section className="card pad-lg row between wrap g-5 rise">
        <div className="row g-4" style={{ minWidth: 0 }}>
          <Avatar name={person.fullName} color={person.avatarColor} size="xl" />
          <div className="stack g-2" style={{ minWidth: 0 }}>
            <div className="row g-2 wrap">
              <RoleBadge role={person.role} />
              <UserStatusBadge status={person.status} />
              {person.emailVerified ? <span className="badge ok">Email verified</span> : <span className="badge warn">Unverified</span>}
            </div>
            <p className="t-sm" style={{ color: "var(--gold)" }}>
              {person.title || person.discipline || "—"}
            </p>
            {person.bio ? (
              <p className="t-sm muted" style={{ maxWidth: "52ch", lineHeight: 1.6 }}>
                {person.bio}
              </p>
            ) : null}
          </div>
        </div>

        <div className="stack g-3">
          <StatusControl userId={person.id} status={person.status} />
          <div className="row g-2">
            <RoleSelect userId={person.id} role={person.role} />
            {person.role === "intern" ? (
              <MentorSelect userId={person.id} mentorId={person.mentorId} mentors={mentors()} />
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Hours approved" value={formatHours(totalApprovedHours(person.id))} gold />
        </div>
        <div className="card">
          <Stat label="Tasks" value={tasks.length} meta={`${tasks.filter((t) => t.status === "done").length} done`} />
        </div>
        <div className="card">
          <Stat label="Submissions" value={submissions.length} meta={`${submissions.filter((s) => s.status === "approved").length} approved`} />
        </div>
        <div className="card">
          <Stat label="Active sessions" value={sessions.length} meta="Signed-in devices" />
        </div>
      </section>

      <div className="split">
        <section className="panel rise">
          <div className="panel-head">
            <h3>Recent tasks</h3>
            <span className="badge tnum">{tasks.length}</span>
          </div>
          <div className="panel-body tight">
            {tasks.slice(0, 8).map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="row between g-4"
                style={{ padding: "14px 22px", borderBottom: "1px solid var(--line-soft)" }}
              >
                <span className="medium truncate">{task.title}</span>
                <TaskStatusBadge status={task.status} />
              </Link>
            ))}
            {!tasks.length ? <p className="t-sm faint" style={{ padding: 22 }}>No tasks assigned.</p> : null}
          </div>
        </section>

        <aside className="stack g-4">
          <section className="panel rise">
            <div className="panel-head">
              <h3 style={{ fontSize: "var(--step-0)" }}>Account</h3>
            </div>
            <div className="panel-body stack g-4">
              {[
                ["Joined", formatDate(person.createdAt)],
                ["Last sign-in", person.lastSignInAt ? relativeTime(person.lastSignInAt) : "Never"],
                ["Discipline", person.discipline || "—"],
                ["Cohort", person.cohort || "—"],
                ["Mentor", mentor?.fullName ?? "—"],
                ["Location", person.location || "—"],
                ["Time entries", String(entries.length)],
              ].map(([label, value]) => (
                <div key={label} className="row between g-3">
                  <span className="t-xs faint nowrap">{label}</span>
                  <span className="t-sm truncate" style={{ textAlign: "right" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {person.links.length ? (
            <section className="panel rise">
              <div className="panel-head">
                <h3 style={{ fontSize: "var(--step-0)" }}>Links</h3>
              </div>
              <div className="panel-body stack g-2">
                {person.links.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener" className="link t-sm row g-2">
                    <Icon.link size={14} /> {link.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
