"use server";

import { revalidatePath } from "next/cache";

import { requireAuth, requireRole } from "../auth/guards";
import { recordAudit } from "../auth/session";
import { mutate, id, now, read } from "../db/store";
import { formError, formSuccess, num, str, type FormState } from "../forms";
import { today } from "../format";
import { visibleUserIds } from "../queries";

/**
 * Timesheets. Interns log hours (clock in/out or by hand) and submit a week;
 * mentors approve or return it. Approved entries are locked.
 */

const MAX_HOURS_PER_ENTRY = 16;

export async function clockInAction(): Promise<void> {
  const { user } = await requireAuth();

  const running = read().timeEntries.find((t) => t.userId === user.id && t.startedAt);
  if (running) return;

  const projectId = null;
  mutate((db) =>
    db.timeEntries.push({
      id: id("tme"),
      userId: user.id,
      date: today(),
      projectId,
      taskId: null,
      hours: 0,
      note: "",
      status: "draft",
      startedAt: now(),
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: "",
      createdAt: now(),
    }),
  );

  await recordAudit("time.clock_in", user.email);
  revalidatePath("/timesheet");
  revalidatePath("/dashboard");
}

export async function clockOutAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireAuth();
  const note = str(data, "note");
  const projectId = str(data, "projectId") || null;

  const result = mutate((db) => {
    const entry = db.timeEntries.find((t) => t.userId === user.id && t.startedAt);
    if (!entry?.startedAt) return null;

    const elapsedHours = (Date.now() - new Date(entry.startedAt).getTime()) / 3_600_000;
    // Round to the nearest 5 minutes — nobody bills to the second.
    const rounded = Math.min(MAX_HOURS_PER_ENTRY, Math.round(elapsedHours * 12) / 12);

    entry.hours = Math.max(0.08, rounded);
    entry.note = note || "Clocked session";
    entry.projectId = projectId;
    entry.startedAt = null;
    return entry.hours;
  });

  if (result === null) return formError("You're not clocked in.");

  await recordAudit("time.clock_out", user.email, { hours: result.toFixed(2) });
  revalidatePath("/timesheet");
  revalidatePath("/dashboard");
  return formSuccess("Session logged.");
}

export async function addTimeEntryAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireAuth();

  const date = str(data, "date");
  const hours = num(data, "hours");
  const note = str(data, "note");
  const projectId = str(data, "projectId") || null;

  const fields: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fields.date = "Pick a date.";
  if (hours === null || hours <= 0) fields.hours = "Enter the hours worked.";
  else if (hours > MAX_HOURS_PER_ENTRY) fields.hours = `That's more than ${MAX_HOURS_PER_ENTRY} hours.`;
  if (date > today()) fields.date = "You can't log hours in the future.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  mutate((db) =>
    db.timeEntries.push({
      id: id("tme"),
      userId: user.id,
      date,
      projectId,
      taskId: null,
      hours: hours as number,
      note,
      status: "draft",
      startedAt: null,
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: "",
      createdAt: now(),
    }),
  );

  await recordAudit("time.entry_added", date, { hours: String(hours) });
  revalidatePath("/timesheet");
  revalidatePath("/dashboard");
  return formSuccess("Entry added.");
}

export async function deleteTimeEntryAction(entryId: string): Promise<void> {
  const { user } = await requireAuth();

  const removed = mutate((db) => {
    const index = db.timeEntries.findIndex(
      (t) => t.id === entryId && t.userId === user.id && t.status === "draft",
    );
    if (index === -1) return false;
    db.timeEntries.splice(index, 1);
    return true;
  });

  if (!removed) return;
  await recordAudit("time.entry_deleted", entryId);
  revalidatePath("/timesheet");
}

/** Submit every draft entry in a week for approval. */
export async function submitWeekAction(weekStartDate: string): Promise<void> {
  const { user } = await requireAuth();

  const end = new Date(`${weekStartDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  const endDate = end.toISOString().slice(0, 10);

  const count = mutate((db) => {
    let n = 0;
    for (const entry of db.timeEntries) {
      if (
        entry.userId === user.id &&
        entry.status === "draft" &&
        !entry.startedAt &&
        entry.date >= weekStartDate &&
        entry.date <= endDate
      ) {
        entry.status = "submitted";
        entry.submittedAt = now();
        n += 1;
      }
    }
    return n;
  });

  if (!count) return;
  await recordAudit("time.week_submitted", weekStartDate, { entries: String(count) });
  revalidatePath("/timesheet");
  revalidatePath("/review");
}

export async function reviewTimeEntryAction(entryId: string, approve: boolean): Promise<void> {
  const { user } = await requireRole("mentor");

  const ok = mutate((db) => {
    const entry = db.timeEntries.find((t) => t.id === entryId);
    if (!entry || entry.status !== "submitted") return false;

    const scope = visibleUserIds(user);
    if (scope !== null && !scope.has(entry.userId)) return false;

    entry.status = approve ? "approved" : "rejected";
    entry.reviewedBy = user.id;
    entry.reviewedAt = now();
    return true;
  });

  if (!ok) return;
  await recordAudit(approve ? "time.approved" : "time.rejected", entryId);
  revalidatePath("/review");
  revalidatePath("/timesheet");
}

/** Approve a whole person's submitted week in one go. */
export async function approveAllForUserAction(userId: string): Promise<void> {
  const { user } = await requireRole("mentor");

  const scope = visibleUserIds(user);
  if (scope !== null && !scope.has(userId)) return;

  const count = mutate((db) => {
    let n = 0;
    for (const entry of db.timeEntries) {
      if (entry.userId === userId && entry.status === "submitted") {
        entry.status = "approved";
        entry.reviewedBy = user.id;
        entry.reviewedAt = now();
        n += 1;
      }
    }
    return n;
  });

  if (!count) return;
  await recordAudit("time.bulk_approved", userId, { entries: String(count) });
  revalidatePath("/review");
  revalidatePath("/timesheet");
}
