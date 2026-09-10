"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requireRole } from "../auth/guards";
import { recordAudit } from "../auth/session";
import { mutate, id, now } from "../db/store";
import { formError, formSuccess, num, str, type FormState } from "../forms";
import { safeUrl } from "../format";
import { visibleUserIds } from "../queries";

/** Deliverables are submitted as links — Figma, Drive, Frame.io and so on. */

export async function createSubmissionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireAuth();

  const title = str(data, "title");
  const description = str(data, "description");
  const projectId = str(data, "projectId") || null;
  const taskId = str(data, "taskId") || null;

  const links: { label: string; url: string }[] = [];
  for (let i = 0; i < 4; i += 1) {
    const url = str(data, `url${i}`);
    if (!url) continue;
    const safe = safeUrl(url);
    if (!safe) return formError(`"${url}" isn't a valid http(s) link.`, { [`url${i}`]: "Check this link." });
    links.push({ label: str(data, `label${i}`) || new URL(safe).hostname.replace(/^www\./, ""), url: safe });
  }

  const fields: Record<string, string> = {};
  if (!title) fields.title = "Give it a title.";
  if (!links.length) fields.url0 = "Add at least one link to the work.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  mutate((db) =>
    db.submissions.push({
      id: id("sub"),
      userId: user.id,
      taskId,
      projectId,
      title,
      description,
      links,
      status: "pending",
      submittedAt: now(),
      reviewerId: null,
      reviewedAt: null,
      rating: null,
      feedback: "",
    }),
  );

  // A submission against a task moves the task into review too.
  if (taskId) {
    mutate((db) => {
      const task = db.tasks.find((t) => t.id === taskId && t.assigneeId === user.id);
      if (task && task.status !== "done") {
        task.status = "submitted";
        task.updatedAt = now();
      }
    });
  }

  await recordAudit("submission.created", title);
  revalidatePath("/submissions");
  revalidatePath("/review");
  revalidatePath("/dashboard");
  return formSuccess("Submitted for review.");
}

export async function reviewSubmissionAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireRole("mentor");

  const submissionId = str(data, "submissionId");
  const decision = str(data, "decision");
  const feedback = str(data, "feedback");
  const rating = num(data, "rating");

  if (decision !== "approve" && decision !== "changes") return formError("Pick a decision.");
  if (!feedback) return formError("Write a line of feedback — that's the point.", { feedback: "Required." });
  if (rating !== null && (rating < 1 || rating > 5)) return formError("Rating must be 1–5.");

  const ok = mutate((db) => {
    const submission = db.submissions.find((s) => s.id === submissionId);
    if (!submission) return false;

    const scope = visibleUserIds(user);
    if (scope !== null && !scope.has(submission.userId)) return false;

    submission.status = decision === "approve" ? "approved" : "changes_requested";
    submission.feedback = feedback;
    submission.rating = rating;
    submission.reviewerId = user.id;
    submission.reviewedAt = now();

    if (submission.taskId) {
      const task = db.tasks.find((t) => t.id === submission.taskId);
      if (task) {
        task.status = decision === "approve" ? "done" : "changes_requested";
        task.updatedAt = now();
        task.approvedBy = decision === "approve" ? user.id : null;
        task.approvedAt = decision === "approve" ? now() : null;
        task.completedAt = decision === "approve" ? now() : null;
      }
    }
    return true;
  });

  if (!ok) return formError("You can't review that submission.");

  await recordAudit(decision === "approve" ? "submission.approved" : "submission.returned", submissionId);
  revalidatePath("/review");
  revalidatePath("/submissions");
  return formSuccess("Feedback sent.");
}
