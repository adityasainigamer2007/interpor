import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/ui/Badges";
import { EmptyState, Progress, Stat } from "@/components/ui/Page";
import { Icon } from "@/components/ui/Icons";
import { can, requireAuth } from "@/lib/auth/guards";
import { dueLabel, formatDate, formatHours } from "@/lib/format";
import { projectById, tasksVisibleTo, timeEntriesVisibleTo, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireAuth();

  const project = projectById(id);
  if (!project) notFound();

  const isMember = project.memberIds.includes(user.id) || project.leadId === user.id;
  if (!isMember && !can(user, "admin")) notFound();

  const people = userMap();
  const tasks = tasksVisibleTo(user).filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.status === "done").length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const hours = timeEntriesVisibleTo(user)
    .filter((t) => t.projectId === project.id)
    .reduce((sum, t) => sum + t.hours, 0);
  const lead = people.get(project.leadId);

  return (
    <div className="stack g-5">
      <Link href="/projects" className="link-quiet t-sm row g-2" style={{ width: "fit-content" }}>
        <span style={{ rotate: "180deg", display: "inline-flex" }}>
          <Icon.arrow size={15} />
        </span>
        All projects
      </Link>

      <header className="stack g-4 rise">
        <div className="row g-3 wrap">
          <ProjectStatusBadge status={project.status} />
          <span className="badge">{project.client}</span>
        </div>
        <h1 style={{ fontSize: "var(--step-4)" }}>{project.name}</h1>
        <p className="lede">{project.summary}</p>
      </header>

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Progress" value={`${percent}%`} meta={`${done} of ${tasks.length} tasks`} gold />
          <div style={{ marginTop: 12 }}>
            <Progress value={percent} />
          </div>
        </div>
        <div className="card">
          <Stat label="Hours logged" value={formatHours(hours)} meta="Across the team" />
        </div>
        <div className="card">
          <Stat label="Starts" value={formatDate(project.startDate)} />
        </div>
        <div className="card">
          <Stat label="Due" value={formatDate(project.dueDate)} meta={dueLabel(project.dueDate).text} />
        </div>
      </section>

      <div className="split">
        <section className="panel rise">
          <div className="panel-head">
            <h3>Tasks on this project</h3>
            <span className="badge tnum">{tasks.length}</span>
          </div>

          {tasks.length ? (
            <div className="panel-body tight">
              {tasks.map((task) => {
                const assignee = people.get(task.assigneeId);
                const due = dueLabel(task.dueDate);
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="row between g-4"
                    style={{ padding: "15px 22px", borderBottom: "1px solid var(--line-soft)" }}
                  >
                    <div className="stack g-2" style={{ minWidth: 0 }}>
                      <span className="medium truncate">{task.title}</span>
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <div className="row g-3">
                      <span className="t-xs faint nowrap">{task.status === "done" ? "Complete" : due.text}</span>
                      <Avatar
                        name={assignee?.fullName ?? "?"}
                        color={assignee?.avatarColor}
                        size="sm"
                        title={assignee?.fullName}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No tasks on this project yet" />
          )}
        </section>

        <aside className="panel rise">
          <div className="panel-head">
            <h3 style={{ fontSize: "var(--step-0)" }}>Team</h3>
          </div>
          <div className="panel-body stack g-4">
            {project.memberIds.map((memberId) => {
              const member = people.get(memberId);
              if (!member) return null;
              return (
                <div key={memberId} className="row g-3">
                  <Avatar name={member.fullName} color={member.avatarColor} />
                  <div className="stack" style={{ minWidth: 0 }}>
                    <span className="t-sm medium truncate">{member.fullName}</span>
                    <span className="t-xs faint truncate">
                      {memberId === project.leadId ? "Project lead" : member.title || member.discipline}
                    </span>
                  </div>
                </div>
              );
            })}
            {lead && !project.memberIds.includes(lead.id) ? (
              <div className="row g-3">
                <Avatar name={lead.fullName} color={lead.avatarColor} />
                <div className="stack">
                  <span className="t-sm medium">{lead.fullName}</span>
                  <span className="t-xs faint">Project lead</span>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
