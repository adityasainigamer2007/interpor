import type { Metadata } from "next";
import Link from "next/link";

import { ClockCard } from "@/components/dashboard/ClockCard";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge, TaskStatusBadge } from "@/components/ui/Badges";
import { EmptyState, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireAuth } from "@/lib/auth/guards";
import { dueLabel, formatHours, relativeTime, truncate } from "@/lib/format";
import {
  announcementsFor,
  hoursSeries,
  onboardingProgress,
  projectMap,
  projectsVisibleTo,
  reviewQueueFor,
  runningEntry,
  submissionsFor,
  tasksFor,
  totalApprovedHours,
  userMap,
  weekSummaryFor,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; denied?: string }>;
}) {
  const { welcome, denied } = await searchParams;
  const { user } = await requireAuth();

  const tasks = tasksFor(user.id);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const upcoming = openTasks.slice(0, 5);
  const week = weekSummaryFor(user.id);
  const series = hoursSeries(user.id, 14);
  const running = runningEntry(user.id);
  const projects = projectsVisibleTo(user);
  const onboarding = onboardingProgress(user);
  const announcements = announcementsFor(user).slice(0, 3);
  const submissions = submissionsFor(user.id);
  const reviewed = submissions.filter((s) => s.rating !== null);
  const avgRating = reviewed.length ? reviewed.reduce((s, x) => s + (x.rating ?? 0), 0) / reviewed.length : null;
  const queue = reviewQueueFor(user);
  const people = userMap();
  const projectsById = projectMap();
  const latestFeedback = submissions.find((s) => s.feedback);

  return (
    <div className="stack g-6">
      {welcome ? (
        <div className="alert alert-ok rise">
          <span>
            Welcome to the studio, {user.firstName}. Start with the checklist below — it takes about
            a morning.
          </span>
        </div>
      ) : null}
      {denied ? (
        <div className="alert alert-warn rise">
          <span>That area is for mentors and admins. Ask the studio if you think you should have access.</span>
        </div>
      ) : null}

      {/* ---------- Figures ---------- */}
      <section className="grid grid-4 rise">
        <div className="card">
          <Stat
            label="This week"
            value={formatHours(week.totalHours)}
            meta={`${week.entries.length} ${week.entries.length === 1 ? "entry" : "entries"} logged`}
            gold
          />
          <div style={{ marginTop: 14, marginInline: -6 }}>
            <Sparkline points={series} />
          </div>
        </div>

        <div className="card">
          <Stat
            label="Open tasks"
            value={openTasks.length}
            meta={
              openTasks.filter((t) => t.dueDate && dueLabel(t.dueDate).tone === "danger").length > 0
                ? `${openTasks.filter((t) => t.dueDate && dueLabel(t.dueDate).tone === "danger").length} overdue`
                : "Nothing overdue"
            }
          />
        </div>

        <div className="card">
          <Stat
            label="Hours approved"
            value={formatHours(totalApprovedHours(user.id))}
            meta="Counts toward your reference"
          />
        </div>

        <div className="card">
          <Stat
            label="Average rating"
            value={avgRating ? avgRating.toFixed(1) : "—"}
            meta={reviewed.length ? `Across ${reviewed.length} reviewed` : "No reviews yet"}
            gold={!!avgRating}
          />
        </div>
      </section>

      <div className="split">
        {/* ---------- Left column ---------- */}
        <div className="stack g-5" style={{ minWidth: 0 }}>
          {/* Mentor's review queue */}
          {queue.total > 0 ? (
            <section className="card accent row between wrap g-4 rise">
              <div className="stack g-2">
                <span className="eyebrow no-rule">Waiting on you</span>
                <p className="t-lg medium">
                  {queue.total} {queue.total === 1 ? "item needs" : "items need"} your review
                </p>
                <p className="t-sm muted">
                  {queue.submissions.length} deliverable{queue.submissions.length === 1 ? "" : "s"} ·{" "}
                  {queue.tasks.length} task{queue.tasks.length === 1 ? "" : "s"} · {queue.timesheets.length} timesheet
                  {queue.timesheets.length === 1 ? "" : " entries"}
                </p>
              </div>
              <Link href="/review" className="btn btn-primary">
                Open review queue <Icon.arrow size={16} />
              </Link>
            </section>
          ) : null}

          {/* Tasks */}
          <section className="panel rise">
            <div className="panel-head">
              <h3>Your next tasks</h3>
              <Link href="/tasks" className="link t-sm">
                All tasks
              </Link>
            </div>

            {upcoming.length ? (
              <div className="panel-body tight">
                {upcoming.map((task) => {
                  const due = dueLabel(task.dueDate);
                  const project = task.projectId ? projectsById.get(task.projectId) : null;
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className="row between g-4"
                      style={{ padding: "15px 22px", borderBottom: "1px solid var(--line-soft)" }}
                    >
                      <div className="stack g-2" style={{ minWidth: 0 }}>
                        <span className="medium truncate">{task.title}</span>
                        <span className="row g-2 wrap">
                          <TaskStatusBadge status={task.status} />
                          {project ? <span className="badge">{truncate(project.name, 26)}</span> : null}
                        </span>
                      </div>
                      <span
                        className="t-xs nowrap"
                        style={{
                          color:
                            due.tone === "danger" ? "#dd968c"
                            : due.tone === "warn" ? "#dfbe7a"
                            : "var(--text-faint)",
                        }}
                      >
                        {due.text}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="Nothing on your plate"
                description="When a mentor assigns you work it shows up here."
                action={
                  <Link href="/projects" className="btn btn-ghost btn-sm">
                    Browse projects
                  </Link>
                }
              />
            )}
          </section>

          {/* Latest feedback */}
          {latestFeedback ? (
            <section className="panel rise">
              <div className="panel-head">
                <h3>Latest feedback</h3>
                <Link href="/submissions" className="link t-sm">
                  All submissions
                </Link>
              </div>
              <div className="panel-body stack g-3">
                <div className="row between g-3 wrap">
                  <span className="medium">{latestFeedback.title}</span>
                  {latestFeedback.rating ? (
                    <span className="row g-1" aria-label={`${latestFeedback.rating} out of 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <span
                          key={i}
                          style={{ color: i < (latestFeedback.rating ?? 0) ? "var(--gold)" : "var(--ink-700)" }}
                        >
                          <Icon.star size={14} />
                        </span>
                      ))}
                    </span>
                  ) : null}
                </div>
                <blockquote
                  className="t-sm muted"
                  style={{
                    borderLeft: "2px solid var(--gold)",
                    paddingLeft: 14,
                    lineHeight: 1.65,
                    fontStyle: "italic",
                  }}
                >
                  {latestFeedback.feedback}
                </blockquote>
                <span className="t-xs faint">
                  {latestFeedback.reviewerId ? people.get(latestFeedback.reviewerId)?.fullName : "Studio"} ·{" "}
                  {relativeTime(latestFeedback.reviewedAt)}
                </span>
              </div>
            </section>
          ) : null}
        </div>

        {/* ---------- Right column ---------- */}
        <div className="stack g-5" style={{ minWidth: 0 }}>
          <div className="rise">
            <ClockCard startedAt={running?.startedAt ?? null} projects={projects} />
          </div>

          {user.role === "intern" && !onboarding.complete ? (
            <div className="rise">
              <OnboardingCard
                steps={onboarding.steps}
                done={onboarding.done}
                total={onboarding.total}
                percent={onboarding.percent}
              />
            </div>
          ) : null}

          <section className="panel rise">
            <div className="panel-head">
              <h3>From the studio</h3>
              <Link href="/announcements" className="link t-sm">
                All
              </Link>
            </div>
            {announcements.length ? (
              <div className="panel-body stack g-4">
                {announcements.map((a) => (
                  <div key={a.id} className="stack g-2">
                    <div className="row g-2">
                      {a.pinned ? <span className="badge gold">Pinned</span> : null}
                      <span className="t-xs faint">{relativeTime(a.createdAt)}</span>
                    </div>
                    <Link href="/announcements" className="t-sm medium">
                      {a.title}
                    </Link>
                    <p className="t-xs muted clamp-2" style={{ lineHeight: 1.6 }}>
                      {a.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing posted yet" />
            )}
          </section>

          {projects.length ? (
            <section className="panel rise">
              <div className="panel-head">
                <h3>Your projects</h3>
                <Link href="/projects" className="link t-sm">
                  All
                </Link>
              </div>
              <div className="panel-body stack g-4">
                {projects.slice(0, 3).map((p) => {
                  const lead = people.get(p.leadId);
                  return (
                    <Link key={p.id} href={`/projects/${p.id}`} className="row g-3">
                      <Avatar name={lead?.fullName ?? "Studio"} color={lead?.avatarColor} size="sm" />
                      <span className="stack" style={{ minWidth: 0 }}>
                        <span className="t-sm medium truncate">{p.name}</span>
                        <span className="t-xs faint truncate">{p.client}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
