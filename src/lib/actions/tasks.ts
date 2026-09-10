"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requireRole } from "../auth/guards";
import { recordAudit } from "../auth/session";
import { mutate, id, now } from "../db/store";
import type { TaskPriority, TaskStatus } from "../db/schema";
import { formError, formSuccess, num, str, type FormState } from "../forms";
import { visibleUserIds } from "../queries";

/** Statuses an intern may set on their own task. Sign-off is mentor-only. */
const SELF_SERVE: TaskStatus[] = ["todo", "in_progress", "submitted"];

export async function updateTaskStatusAction(taskId: string, status: TaskStatus): Promise<void> {
  const { user } = await requireAuth();

  const outcome = mutate((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return "missing";

    const isOwner = task.assigneeId === user.id;
    const isReviewer = user.role === "admin" || user.role === "mentor";
    if (!isOwner && !isReviewer) return "forbidden";
    if (isOwner && !isReviewer && !SELF_SERVE.includes(status)) return "forbidden";

    task.status = status;
    task.updatedAt = now();

    if (status === "done") {
      task.completedAt = now();
      if (isReviewer) {
        task.approvedBy = user.id;
        task.approvedAt = now();
      }
    } else {
      task.completedAt = null;
      task.approvedBy = null;
      task.approvedAt = null;
    }
    return task.title;
  });

  if (outcome === "missing" || outcome === "forbidden") return;

  await recordAudit("task.status_changed", outcome, { status });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/review");
}

export async function addTaskCommentAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireAuth();
  const taskId = str(data, "taskId");
  const body = str(data, "body");

  if (!body) return formError("Write something first.");
  if (body.length > 4000) return formError("That comment is too long.");

  const ok = mutate((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task) return false;

    const scope = visibleUserIds(user);
    const allowed = scope === null || scope.has(task.assigneeId) || task.createdBy === user.id;
    if (!allowed) return false;

    task.comments.push({ id: id("cmt"), authorId: user.id, body, createdAt: now() });
    task.updatedAt = now();
    return true;
  });

  if (!ok) return formError("You can't comment on that task.");

  await recordAudit("task.commented", taskId);
  revalidatePath(`/tasks/${taskId}`);
  return formSuccess("Comment added.");
}

export async function createTaskAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireRole("mentor");

  const title = str(data, "title");
  const description = str(data, "description");
  const assigneeId = str(data, "assigneeId");
  const projectId = str(data, "projectId") || null;
  const priority = (str(data, "priority") || "medium") as TaskPriority;
  const dueDate = str(data, "dueDate") || null;
  const estimateHours = num(data, "estimateHours");
  const tags = str(data, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);

  const fields: Record<string, string> = {};
  if (!title) fields.title = "Give the task a title.";
  if (!assigneeId) fields.assigneeId = "Pick someone to do it.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  const taskId = id("tsk");
  mutate((db) =>
    db.tasks.push({
      id: taskId,
      title,
      description,
      projectId,
      assigneeId,
      createdBy: user.id,
      status: "todo",
      priority,
      dueDate,
      estimateHours,
      tags,
      createdAt: now(),
      updatedAt: now(),
      completedAt: null,
      approvedBy: null,
      approvedAt: null,
      comments: [],
    }),
  );

  await recordAudit("task.created", title, { assigneeId });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return formSuccess(`"${title}" assigned.`);
}

/** Mentor sign-off / send-back from the review queue. */
export async function reviewTaskAction(taskId: string, approve: boolean): Promise<void> {
  const { user } = await requireRole("mentor");

  const title = mutate((db) => {
    const task = db.tasks.find((t) => t.id === taskId);
    if (!task || task.status !== "submitted") return null;

    task.status = approve ? "done" : "changes_requested";
    task.updatedAt = now();
    task.completedAt = approve ? now() : null;
    task.approvedBy = approve ? user.id : null;
    task.approvedAt = approve ? now() : null;
    return task.title;
  });

  if (!title) return;

  await recordAudit(approve ? "task.approved" : "task.returned", title);
  revalidatePath("/review");
  revalidatePath("/tasks");
}
