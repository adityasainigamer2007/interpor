import type { Metadata } from "next";
import Link from "next/link";

import { NewTaskForm } from "@/components/tasks/NewTaskForm";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityBadge, TaskStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { requireAuth } from "@/lib/auth/guards";
import { can } from "@/lib/auth/guards";
import type { TaskStatus } from "@/lib/db/schema";
import { dueLabel, truncate } from "@/lib/format";
import { allUsers, projectMap, projectsVisibleTo, tasksVisibleTo, userMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Tasks" };

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "submitted", label: "In review" },
  { status: "done", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string }>;
}) {
  const { status = "", view = "board" } = await searchParams;
  const { user } = await requireAuth();

  const all = tasksVisibleTo(user);
  const filtered = status ? all.filter((t) => t.status === status) : all;
  const people = userMap();
  const projects = projectMap();
  const isMentor = can(user, "mentor");

  const assignable = isMentor
    ? allUsers().filter((u) => u.status === "active" && (u.role === "intern" || u.id === user.id))
    : [];

  const boardMode = view === "board" && !status;

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow={isMentor ? "Everything you oversee" : "Your work"}
        title="Tasks"
        description={
          isMentor
            ? "Every task assigned to you and to the people you mentor."
            : "What the studio has asked you to do, and where each piece stands."
        }
        actions={
          <>
            <Link
              href={boardMode ? "/tasks?view=list" : "/tasks?view=board"}
              className="btn btn-ghost btn-sm"
              scroll={false}
            >
              {boardMode ? "List view" : "Board view"}
            </Link>
          </>
        }
      />

      {isMentor ? <NewTaskForm people={assignable} projects={projectsVisibleTo(user)} /> : null}

      {!boardMode ? <TaskFilters active={status} /> : null}

      {!all.length ? (
        <div className="panel">
          <EmptyState
            title="No tasks yet"
            description={
              isMentor
                ? "Assign the first one and it'll appear here."
                : "When a mentor assigns you work it shows up here."
            }
          />
        </div>
      ) : boardMode ? (
        <div className="board">
          {COLUMNS.map((column) => {
            const items = all.filter((t) =>
              column.status === "todo"
                ? t.status === "todo" || t.status === "changes_requested"
                : t.status === column.status,
            );
            return (
              <div key={column.status} className="board-col">
                <div className="board-col-head">
                  <span className="caps" style={{ color: "var(--text-dim)" }}>
                    {column.label}
                  </span>
                  <span className="badge tnum">{items.length}</span>
                </div>

                {items.length ? (
                  items.map((task) => {
                    const due = dueLabel(task.dueDate);
                    const assignee = people.get(task.assigneeId);
                    const project = task.projectId ? projects.get(task.projectId) : null;
                    return (
                      <Link key={task.id} href={`/tasks/${task.id}`} className="task-card">
                        <div className="stack g-3">
                          <span className="t-sm medium" style={{ lineHeight: 1.4 }}>
                            {task.title}
                          </span>
                          {project ? <span className="t-xs faint truncate">{project.name}</span> : null}
                          <div className="row between g-2">
                            <div className="row g-2">
                              <Avatar
                                name={assignee?.fullName ?? "?"}
                                color={assignee?.avatarColor}
                                size="sm"
                                title={assignee?.fullName}
                              />
                              {task.status === "changes_requested" ? (
                                <span className="badge danger">Changes</span>
                              ) : null}
                            </div>
                            <span
                              className="t-xs nowrap"
                              style={{
                                color:
                                  due.tone === "danger" ? "#dd968c"
                                  : due.tone === "warn" ? "#dfbe7a"
                                  : "var(--text-ghost)",
                              }}
                            >
                              {task.status === "done" ? "Complete" : due.text}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="t-xs faint" style={{ padding: "18px 4px", textAlign: "center" }}>
                    Nothing here
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assignee</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const due = dueLabel(task.dueDate);
                  const assignee = people.get(task.assigneeId);
                  const project = task.projectId ? projects.get(task.projectId) : null;
                  return (
                    <tr key={task.id}>
                      <td>
                        <Link href={`/tasks/${task.id}`} className="medium">
                          {truncate(task.title, 52)}
                        </Link>
                      </td>
                      <td>
                        <span className="row g-2">
                          <Avatar name={assignee?.fullName ?? "?"} color={assignee?.avatarColor} size="sm" />
                          <span className="t-sm truncate">{assignee?.firstName ?? "—"}</span>
                        </span>
                      </td>
                      <td className="muted">{project ? truncate(project.name, 24) : "—"}</td>
                      <td>
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td>
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td
                        className="nowrap"
                        style={{
                          color:
                            task.status === "done" ? "var(--text-faint)"
                            : due.tone === "danger" ? "#dd968c"
                            : due.tone === "warn" ? "#dfbe7a"
                            : "var(--text-dim)",
                        }}
                      >
                        {due.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!filtered.length ? <EmptyState title="Nothing matches that filter" /> : null}
        </div>
      )}
    </div>
  );
}
