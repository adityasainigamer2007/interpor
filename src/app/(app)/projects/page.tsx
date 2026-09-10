import type { Metadata } from "next";
import Link from "next/link";

import { NewProjectForm } from "@/components/projects/NewProjectForm";
import { Avatar } from "@/components/ui/Avatar";
import { ProjectStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader, Progress } from "@/components/ui/Page";
import { can, requireAuth } from "@/lib/auth/guards";
import { daysUntil, formatDate } from "@/lib/format";
import { allProjects, allUsers, projectsVisibleTo, tasksVisibleTo, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const { user } = await requireAuth();

  const isMentor = can(user, "mentor");
  const projects = can(user, "admin") ? allProjects() : projectsVisibleTo(user);
  const teammates = isMentor ? allUsers().filter((u) => u.status === "active" && u.id !== user.id) : [];
  const tasks = tasksVisibleTo(user);
  const people = userMap();

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Live client work"
        title="Projects"
        description="The jobs you're attached to, who's leading them and how far along they are."
      />

      {isMentor ? <NewProjectForm people={teammates} /> : null}

      {projects.length ? (
        <div className="grid grid-auto">
          {projects.map((project, i) => {
            const projectTasks = tasks.filter((t) => t.projectId === project.id);
            const done = projectTasks.filter((t) => t.status === "done").length;
            const percent = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
            const lead = people.get(project.leadId);
            const members = project.memberIds.map((id) => people.get(id)).filter(Boolean);
            const remaining = daysUntil(project.dueDate);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card interactive stack g-4 rise"
                style={{ ["--d" as string]: `${i * 0.05}s` }}
              >
                <div className="row between g-3">
                  <ProjectStatusBadge status={project.status} />
                  <span className="t-xs faint nowrap">
                    {remaining !== null && remaining >= 0 && project.status !== "complete"
                      ? `${remaining}d left`
                      : formatDate(project.dueDate)}
                  </span>
                </div>

                <div className="stack g-2">
                  <h3 style={{ fontSize: "var(--step-2)" }}>{project.name}</h3>
                  <span className="t-xs" style={{ color: "var(--gold)" }}>
                    {project.client}
                  </span>
                </div>

                <p className="t-sm muted clamp-2" style={{ lineHeight: 1.6 }}>
                  {project.summary}
                </p>

                <div className="stack g-2 mt-auto">
                  <div className="row between g-3">
                    <span className="t-xs faint">
                      {done}/{projectTasks.length} tasks
                    </span>
                    <span className="t-xs tnum" style={{ color: "var(--gold)" }}>
                      {percent}%
                    </span>
                  </div>
                  <Progress value={percent} />
                </div>

                <div className="row between g-3">
                  <div className="avatar-stack">
                    {members.slice(0, 4).map((m) => (
                      <Avatar key={m!.id} name={m!.fullName} color={m!.avatarColor} size="sm" title={m!.fullName} />
                    ))}
                  </div>
                  <span className="t-xs faint truncate">Lead: {lead?.firstName ?? "Studio"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            title="You're not on a project yet"
            description="Your mentor will attach you to live client work once you're through onboarding."
          />
        </div>
      )}
    </div>
  );
}
