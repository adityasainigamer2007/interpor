import type { Metadata } from "next";

import { NewSubmissionForm } from "@/components/submissions/NewSubmissionForm";
import { SubmissionStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireAuth } from "@/lib/auth/guards";
import { formatDate, relativeTime } from "@/lib/format";
import { projectMap, projectsVisibleTo, submissionsFor, tasksFor, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Submissions" };

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task } = await searchParams;
  const { user } = await requireAuth();

  const submissions = submissionsFor(user.id);
  const projects = projectsVisibleTo(user);
  const projectsById = projectMap();
  const openTasks = tasksFor(user.id).filter((t) => t.status !== "done");
  const people = userMap();

  const reviewed = submissions.filter((s) => s.rating !== null);
  const avg = reviewed.length ? reviewed.reduce((sum, s) => sum + (s.rating ?? 0), 0) / reviewed.length : null;

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Deliverables"
        title="Submissions"
        description="Hand work in, get it reviewed, keep the feedback. Everything you've submitted stays here."
      />

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Submitted" value={submissions.length} meta="All time" />
        </div>
        <div className="card">
          <Stat label="Awaiting review" value={submissions.filter((s) => s.status === "pending").length} />
        </div>
        <div className="card">
          <Stat label="Approved" value={submissions.filter((s) => s.status === "approved").length} />
        </div>
        <div className="card">
          <Stat
            label="Average rating"
            value={avg ? avg.toFixed(1) : "—"}
            meta={reviewed.length ? `${reviewed.length} reviewed` : "No reviews yet"}
            gold={!!avg}
          />
        </div>
      </section>

      <div className="split">
        <section className="stack g-4" style={{ minWidth: 0 }}>
          {submissions.length ? (
            submissions.map((submission, i) => {
              const reviewer = submission.reviewerId ? people.get(submission.reviewerId) : null;
              const project = submission.projectId ? projectsById.get(submission.projectId) : null;
              return (
                <article
                  key={submission.id}
                  className="card stack g-4 rise"
                  style={{ ["--d" as string]: `${i * 0.04}s` }}
                >
                  <div className="row between g-3 wrap">
                    <SubmissionStatusBadge status={submission.status} />
                    <span className="t-xs faint">{relativeTime(submission.submittedAt)}</span>
                  </div>

                  <div className="stack g-2">
                    <h3 style={{ fontSize: "var(--step-1)" }}>{submission.title}</h3>
                    {project ? (
                      <span className="t-xs" style={{ color: "var(--gold)" }}>
                        {project.name}
                      </span>
                    ) : null}
                    {submission.description ? (
                      <p className="t-sm muted" style={{ lineHeight: 1.65 }}>
                        {submission.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="row g-2 wrap">
                    {submission.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn btn-ghost btn-sm"
                      >
                        <Icon.link size={14} /> {link.label}
                      </a>
                    ))}
                  </div>

                  {submission.feedback ? (
                    <div className="stack g-3" style={{ paddingTop: 4 }}>
                      <hr className="rule" style={{ margin: 0 }} />
                      <div className="row between g-3 wrap">
                        <span className="t-xs faint">
                          {reviewer?.fullName ?? "Studio"} · {formatDate(submission.reviewedAt)}
                        </span>
                        {submission.rating ? (
                          <span className="row g-1" aria-label={`${submission.rating} out of 5`}>
                            {Array.from({ length: 5 }, (_, s) => (
                              <span key={s} style={{ color: s < (submission.rating ?? 0) ? "var(--gold)" : "var(--ink-700)" }}>
                                <Icon.star size={13} />
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </div>
                      <blockquote
                        className="t-sm muted"
                        style={{ borderLeft: "2px solid var(--gold)", paddingLeft: 14, lineHeight: 1.68, fontStyle: "italic" }}
                      >
                        {submission.feedback}
                      </blockquote>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="panel">
              <EmptyState
                title="Nothing submitted yet"
                description="When you've got something to show, hand it in on the right and a mentor will review it."
              />
            </div>
          )}
        </section>

        <aside className="panel rise" style={{ position: "sticky", top: 88 }}>
          <div className="panel-head">
            <h3 style={{ fontSize: "var(--step-0)" }}>Hand in work</h3>
          </div>
          <div className="panel-body">
            <NewSubmissionForm projects={projects} tasks={openTasks} defaultTaskId={task} />
          </div>
        </aside>
      </div>
    </div>
  );
}
