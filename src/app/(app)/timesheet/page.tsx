import type { Metadata } from "next";
import Link from "next/link";

import { AddEntryForm } from "@/components/time/AddEntryForm";
import { DeleteEntryButton, SubmitWeekButton } from "@/components/time/EntryActions";
import { TimesheetStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { requireAuth } from "@/lib/auth/guards";
import { addDays, formatDate, formatHours, shortDay, today as todayStr, weekStart } from "@/lib/format";
import { projectMap, projectsVisibleTo, timeEntriesFor, totalApprovedHours, weekSummaryFor } from "@/lib/queries";

export const metadata: Metadata = { title: "Timesheet" };

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const { user } = await requireAuth();

  const start = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? weekStart(new Date(`${week}T00:00:00Z`)) : weekStart();
  const summary = weekSummaryFor(user.id, start);
  const projects = projectsVisibleTo(user);
  const projectsById = projectMap();
  const today = todayStr();

  const drafts = summary.entries.filter((e) => e.status === "draft" && !e.startedAt);
  const all = timeEntriesFor(user.id);
  const pendingHours = all.filter((e) => e.status === "submitted").reduce((s, e) => s + e.hours, 0);
  const isCurrentWeek = start === weekStart();

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Hours"
        title="Timesheet"
        description="Log your hours as you go. Submit the week and your mentor approves it — approved hours count toward your reference."
      />

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="This week" value={formatHours(summary.totalHours)} meta={formatDate(start)} gold />
        </div>
        <div className="card">
          <Stat label="Awaiting approval" value={formatHours(pendingHours)} meta="Across all weeks" />
        </div>
        <div className="card">
          <Stat label="Approved total" value={formatHours(totalApprovedHours(user.id))} meta="Signed off by a mentor" />
        </div>
        <div className="card">
          <Stat
            label="Daily average"
            value={formatHours(summary.entries.length ? summary.totalHours / new Set(summary.entries.map((e) => e.date)).size : 0)}
            meta="On days you worked"
          />
        </div>
      </section>

      {/* Week navigator */}
      <section className="panel rise">
        <div className="panel-head">
          <div className="row g-3">
            <Link href={`/timesheet?week=${addDays(start, -7)}`} className="btn btn-icon btn-ghost" aria-label="Previous week">
              <span style={{ rotate: "180deg", display: "inline-flex" }}>
                <Icon.arrow size={15} />
              </span>
            </Link>
            <div className="stack">
              <h3 style={{ fontSize: "var(--step-0)" }}>
                {isCurrentWeek ? "This week" : `Week of ${formatDate(start)}`}
              </h3>
              <span className="t-xs faint">
                {formatDate(start)} — {formatDate(addDays(start, 6))}
              </span>
            </div>
            <Link href={`/timesheet?week=${addDays(start, 7)}`} className="btn btn-icon btn-ghost" aria-label="Next week">
              <Icon.arrow size={15} />
            </Link>
          </div>

          <div className="row g-3">
            <span className="t-sm tnum medium">{formatHours(summary.totalHours)}</span>
            {drafts.length ? <SubmitWeekButton weekStart={start} count={drafts.length} /> : null}
          </div>
        </div>

        <div className="panel-body stack g-5">
          <div className="week-grid">
            {summary.days.map((day) => {
              const hours = summary.byDay[day] ?? 0;
              const classes = ["week-day"];
              if (day === today) classes.push("today");
              if (!hours) classes.push("empty");
              return (
                <div key={day} className={classes.join(" ")}>
                  <p className="t-xs faint">{shortDay(day)}</p>
                  <p className="tnum medium" style={{ fontSize: "var(--step-1)", marginTop: 4 }}>
                    {hours ? formatHours(hours) : "—"}
                  </p>
                </div>
              );
            })}
          </div>

          {summary.entries.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Project</th>
                    <th>Note</th>
                    <th className="num">Hours</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {summary.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap">{formatDate(entry.date)}</td>
                      <td className="muted">
                        {entry.projectId ? (projectsById.get(entry.projectId)?.name ?? "—") : "—"}
                      </td>
                      <td className="muted">{entry.startedAt ? "Running…" : entry.note || "—"}</td>
                      <td className="num tnum">{entry.startedAt ? "—" : formatHours(entry.hours)}</td>
                      <td>
                        <TimesheetStatusBadge status={entry.status} />
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {entry.status === "draft" && !entry.startedAt ? (
                          <DeleteEntryButton entryId={entry.id} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Nothing logged this week"
              description="Clock in from your dashboard, or add an entry by hand."
            />
          )}
        </div>
      </section>

      <div className="split">
        <section className="panel rise">
          <div className="panel-head">
            <h3>Recent history</h3>
            <span className="t-xs faint">Last 15 entries</span>
          </div>
          {all.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Note</th>
                    <th className="num">Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {all.slice(0, 15).map((entry) => (
                    <tr key={entry.id}>
                      <td className="nowrap">{formatDate(entry.date)}</td>
                      <td className="muted">{entry.note || "—"}</td>
                      <td className="num tnum">{formatHours(entry.hours)}</td>
                      <td>
                        <TimesheetStatusBadge status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No history yet" />
          )}
        </section>

        <section className="panel rise">
          <div className="panel-head">
            <h3 style={{ fontSize: "var(--step-0)" }}>Add an entry</h3>
          </div>
          <div className="panel-body">
            <AddEntryForm projects={projects} today={today} />
          </div>
        </section>
      </div>
    </div>
  );
}
