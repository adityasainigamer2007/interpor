import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CommentForm } from "@/components/tasks/CommentForm";
import { TaskStatusControl } from "@/components/tasks/TaskStatusControl";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge, TaskStatusBadge } from "@/components/ui/Badges";
import { Icon } from "@/components/ui/Icons";
import { can, requireAuth } from "@/lib/auth/guards";
import { dueLabel, formatDate, formatHours, relativeTime } from "@/lib/format";
import { projectById, taskById, userMap, visibleUserIds } from "@/lib/queries";

export const metadata: Metadata = { title: "Task" };

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireAuth();

  const task = taskById(id);
  if (!task) notFound();

  // Same visibility rule the list uses — no peeking at another cohort's work.
  const scope = visibleUserIds(user);
  const allowed = scope === null || scope.has(task.assigneeId) || task.createdBy === user.id;
  if (!allowed) notFound();

  const people = userMap();
  const assignee = people.get(task.assigneeId);
  const author = people.get(task.createdBy);
  const project = task.projectId ? projectById(task.projectId) : null;
  const due = dueLabel(task.dueDate);
  const isOwner = task.assigneeId === user.id;
  const isReviewer = can(user, "mentor") && !isOwner;

  return (
    <div className="stack g-5">
      <Link href="/tasks" className="link-quiet t-sm row g-2" style={{ width: "fit-content" }}>
        <span style={{ rotate: "180deg", display: "inline-flex" }}>
          <Icon.arrow size={15} />
        </span>
        All tasks
      </Link>

      <div className="split">
        {/* ---------- Main ---------- */}
        <div className="stack g-5" style={{ minWidth: 0 }}>
          <header className="stack g-4 rise">
            <div className="row g-2 wrap">
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.tags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))}
            </div>
            <h1 style={{ fontSize: "var(--step-3)" }}>{task.title}</h1>
            {project ? (
              <Link href={`/projects/${project.id}`} className="link t-sm" style={{ width: "fit-content" }}>
                {project.name} · {project.client}
              </Link>
            ) : null}
          </header>

          {task.description ? (
            <section className="panel rise">
              <div className="panel-head">
                <h3>The brief</h3>
              </div>
              <div className="panel-body">
                <p className="muted" style={{ lineHeight: 1.72, whiteSpace: "pre-wrap" }}>
                  {task.description}
                </p>
              </div>
            </section>
          ) : null}

          {isOwner || isReviewer ? (
            <section className="card stack g-4 rise">
              <span className="stat-label">Move this along</span>
              <TaskStatusControl taskId={task.id} status={task.status} canReview={isReviewer} />
              {isOwner && task.status !== "done" ? (
                <p className="hint">
                  Got something to show?{" "}
                  <Link href={`/submissions?task=${task.id}`} className="link">
                    Submit a deliverable
                  </Link>{" "}
                  and this task goes into review automatically.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="panel rise">
            <div className="panel-head">
              <h3>Discussion</h3>
              <span className="badge tnum">{task.comments.length}</span>
            </div>

            <div className="panel-body stack g-5">
              {task.comments.length ? (
                <div className="stack g-5">
                  {task.comments.map((comment) => {
                    const commenter = people.get(comment.authorId);
                    return (
                      <article key={comment.id} className="row items-start g-3">
                        <Avatar name={commenter?.fullName ?? "?"} color={commenter?.avatarColor} size="sm" />
                        <div className="stack g-2" style={{ minWidth: 0 }}>
                          <div className="row g-2 wrap">
                            <span className="t-sm medium">{commenter?.fullName ?? "Unknown"}</span>
                            <span className="t-xs faint">{relativeTime(comment.createdAt)}</span>
                          </div>
                          <p className="t-sm muted" style={{ lineHeight: 1.68, whiteSpace: "pre-wrap" }}>
                            {comment.body}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="t-sm faint">No comments yet. Start the conversation.</p>
              )}

              <hr className="rule" />
              <CommentForm taskId={task.id} />
            </div>
          </section>
        </div>

        {/* ---------- Meta ---------- */}
        <aside className="stack g-4 rise">
          <section className="panel">
            <div className="panel-head">
              <h3 style={{ fontSize: "var(--step-0)" }}>Details</h3>
            </div>
            <div className="panel-body stack g-4">
              <Row label="Assigned to">
                <span className="row g-2">
                  <Avatar name={assignee?.fullName ?? "?"} color={assignee?.avatarColor} size="sm" />
                  <span className="t-sm">{assignee?.fullName ?? "—"}</span>
                </span>
              </Row>
              <Row label="Set by">
                <span className="t-sm">{author?.fullName ?? "Studio"}</span>
              </Row>
              <Row label="Due">
                <span
                  className="t-sm"
                  style={{
                    color:
                      due.tone === "danger" ? "#dd968c"
                      : due.tone === "warn" ? "#dfbe7a"
                      : "var(--text)",
                  }}
                >
                  {task.dueDate ? formatDate(task.dueDate) : "No due date"}
                </span>
              </Row>
              {task.estimateHours ? (
                <Row label="Estimate">
                  <span className="t-sm">{formatHours(task.estimateHours)}</span>
                </Row>
              ) : null}
              <Row label="Created">
                <span className="t-sm">{formatDate(task.createdAt)}</span>
              </Row>
              {task.approvedBy ? (
                <Row label="Signed off by">
                  <span className="t-sm" style={{ color: "var(--gold)" }}>
                    {people.get(task.approvedBy)?.fullName ?? "Studio"}
                  </span>
                </Row>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3 style={{ fontSize: "var(--step-0)" }}>History</h3>
            </div>
            <div className="panel-body">
              <div className="timeline">
                <div className="timeline-item done">
                  <p className="t-sm medium">Assigned</p>
                  <p className="t-xs faint">{relativeTime(task.createdAt)}</p>
                </div>
                {task.status !== "todo" ? (
                  <div className="timeline-item done">
                    <p className="t-sm medium">Last updated</p>
                    <p className="t-xs faint">{relativeTime(task.updatedAt)}</p>
                  </div>
                ) : null}
                {task.completedAt ? (
                  <div className="timeline-item done">
                    <p className="t-sm medium">Completed</p>
                    <p className="t-xs faint">{relativeTime(task.completedAt)}</p>
                  </div>
                ) : (
                  <div className="timeline-item">
                    <p className="t-sm medium faint">Not finished</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row between g-3">
      <span className="t-xs faint nowrap">{label}</span>
      {children}
    </div>
  );
}
