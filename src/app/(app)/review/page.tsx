import type { Metadata } from "next";
import Link from "next/link";

import { ApproveAllButton, TaskReviewButtons, TimeReviewButtons } from "@/components/review/QueueActions";
import { ReviewForm } from "@/components/review/ReviewForm";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState, PageHeader, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireRole } from "@/lib/auth/guards";
import { formatDate, formatHours, relativeTime } from "@/lib/format";
import { projectMap, reviewQueueFor, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewPage() {
  const { user } = await requireRole("mentor");

  const queue = reviewQueueFor(user);
  const people = userMap();
  const projects = projectMap();

  // Group submitted time entries by person so a week can be approved in one click.
  const timeByUser = new Map<string, typeof queue.timesheets>();
  for (const entry of queue.timesheets) {
    const list = timeByUser.get(entry.userId) ?? [];
    list.push(entry);
    timeByUser.set(entry.userId, list);
  }

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Mentoring"
        title="Review queue"
        description="Everything the people you mentor are waiting on. Written feedback beats a nod in the corridor."
      />

      <section className="grid grid-3 rise">
        <div className="card">
          <Stat label="Deliverables" value={queue.submissions.length} meta="Awaiting your review" gold={queue.submissions.length > 0} />
        </div>
        <div className="card">
          <Stat label="Tasks" value={queue.tasks.length} meta="Submitted for sign-off" />
        </div>
        <div className="card">
          <Stat label="Timesheet entries" value={queue.timesheets.length} meta="Awaiting approval" />
        </div>
      </section>

      {queue.total === 0 ? (
        <div className="panel">
          <EmptyState
            title="You're all caught up"
            description="Nothing is waiting on you. When your mentees submit work it lands here."
          />
        </div>
      ) : null}

      {/* ---------- Deliverables ---------- */}
      {queue.submissions.length ? (
        <section className="stack g-4">
          <h2 style={{ fontSize: "var(--step-2)" }}>Deliverables</h2>
          {queue.submissions.map((submission) => {
            const author = people.get(submission.userId);
            const project = submission.projectId ? projects.get(submission.projectId) : null;
            return (
              <article key={submission.id} className="card stack g-4 rise">
                <div className="row between g-3 wrap">
                  <div className="row g-3">
                    <Avatar name={author?.fullName ?? "?"} color={author?.avatarColor} />
                    <div className="stack">
                      <span className="medium">{author?.fullName ?? "Unknown"}</span>
                      <span className="t-xs faint">
                        {project ? `${project.name} · ` : ""}
                        submitted {relativeTime(submission.submittedAt)}
                      </span>
                    </div>
                  </div>
                  <span className="badge warn">Awaiting review</span>
                </div>

                <div className="stack g-2">
                  <h3 style={{ fontSize: "var(--step-1)" }}>{submission.title}</h3>
                  {submission.description ? (
                    <p className="t-sm muted" style={{ lineHeight: 1.65 }}>
                      {submission.description}
                    </p>
                  ) : null}
                </div>

                <div className="row g-2 wrap">
                  {submission.links.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">
                      <Icon.link size={14} /> {link.label}
                    </a>
                  ))}
                </div>

                <hr className="rule" />
                <ReviewForm submissionId={submission.id} />
              </article>
            );
          })}
        </section>
      ) : null}

      {/* ---------- Tasks ---------- */}
      {queue.tasks.length ? (
        <section className="panel rise">
          <div className="panel-head">
            <h3>Tasks awaiting sign-off</h3>
            <span className="badge tnum">{queue.tasks.length}</span>
          </div>
          <div className="panel-body tight">
            {queue.tasks.map((task) => {
              const assignee = people.get(task.assigneeId);
              return (
                <div
                  key={task.id}
                  className="row between g-4 wrap"
                  style={{ padding: "16px 22px", borderBottom: "1px solid var(--line-soft)" }}
                >
                  <div className="row g-3" style={{ minWidth: 0 }}>
                    <Avatar name={assignee?.fullName ?? "?"} color={assignee?.avatarColor} size="sm" />
                    <div className="stack" style={{ minWidth: 0 }}>
                      <Link href={`/tasks/${task.id}`} className="medium truncate">
                        {task.title}
                      </Link>
                      <span className="t-xs faint">
                        {assignee?.firstName} · updated {relativeTime(task.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <TaskReviewButtons taskId={task.id} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ---------- Timesheets ---------- */}
      {queue.timesheets.length ? (
        <section className="stack g-4">
          <h2 style={{ fontSize: "var(--step-2)" }}>Timesheets</h2>
          {[...timeByUser.entries()].map(([userId, entries]) => {
            const person = people.get(userId);
            const total = entries.reduce((sum, e) => sum + e.hours, 0);
            return (
              <div key={userId} className="panel rise">
                <div className="panel-head">
                  <div className="row g-3">
                    <Avatar name={person?.fullName ?? "?"} color={person?.avatarColor} size="sm" />
                    <div className="stack">
                      <span className="t-sm medium">{person?.fullName ?? "Unknown"}</span>
                      <span className="t-xs faint">
                        {entries.length} {entries.length === 1 ? "entry" : "entries"} · {formatHours(total)}
                      </span>
                    </div>
                  </div>
                  <ApproveAllButton userId={userId} name={person?.firstName ?? "them"} />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Project</th>
                        <th>Note</th>
                        <th className="num">Hours</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="nowrap">{formatDate(entry.date)}</td>
                          <td className="muted">{entry.projectId ? (projects.get(entry.projectId)?.name ?? "—") : "—"}</td>
                          <td className="muted">{entry.note || "—"}</td>
                          <td className="num tnum">{formatHours(entry.hours)}</td>
                          <td style={{ textAlign: "right" }}>
                            <TimeReviewButtons entryId={entry.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
