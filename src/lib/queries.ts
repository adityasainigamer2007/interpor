import "server-only";

import { read } from "./db/store";
import {
  type Announcement,
  type PublicUser,
  type Project,
  type Resource,
  type Submission,
  type TaskItem,
  type TimeEntry,
  toPublicUser,
  ROLE_RANK,
  ONBOARDING_STEPS,
} from "./db/schema";
import { addDays, weekStart } from "./format";

/**
 * Read-side helpers.
 *
 * Every page pulls its data through here rather than touching the store, so
 * visibility rules ("an intern sees their own work; a mentor sees their
 * mentees'; an admin sees everything") live in exactly one place.
 */

/* ---------- People ---------- */

export function allUsers(): PublicUser[] {
  return read()
    .users.map(toPublicUser)
    .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.firstName.localeCompare(b.firstName));
}

export function userById(id: string): PublicUser | null {
  const found = read().users.find((u) => u.id === id);
  return found ? toPublicUser(found) : null;
}

export function usersByIds(ids: string[]): PublicUser[] {
  const set = new Set(ids);
  return read().users.filter((u) => set.has(u.id)).map(toPublicUser);
}

export function mentors(): PublicUser[] {
  return read()
    .users.filter((u) => u.role === "mentor" || u.role === "admin")
    .map(toPublicUser);
}

export function menteesOf(mentorId: string): PublicUser[] {
  return read().users.filter((u) => u.mentorId === mentorId).map(toPublicUser);
}

/** A quick lookup map for rendering names without N queries. */
export function userMap(): Map<string, PublicUser> {
  return new Map(read().users.map((u) => [u.id, toPublicUser(u)]));
}

/**
 * The set of user ids a viewer is allowed to see work for.
 * `null` means "everyone" (admins).
 */
export function visibleUserIds(viewer: PublicUser): Set<string> | null {
  if (viewer.role === "admin") return null;
  if (viewer.role === "mentor") {
    const ids = menteesOf(viewer.id).map((u) => u.id);
    return new Set([viewer.id, ...ids]);
  }
  return new Set([viewer.id]);
}

function canSee(viewer: PublicUser, ownerId: string): boolean {
  const scope = visibleUserIds(viewer);
  return scope === null || scope.has(ownerId);
}

/* ---------- Tasks ---------- */

export function tasksVisibleTo(viewer: PublicUser): TaskItem[] {
  return read()
    .tasks.filter((t) => canSee(viewer, t.assigneeId) || t.createdBy === viewer.id)
    .sort(byDueThenPriority);
}

export function tasksFor(userId: string): TaskItem[] {
  return read().tasks.filter((t) => t.assigneeId === userId).sort(byDueThenPriority);
}

export function taskById(id: string): TaskItem | null {
  return read().tasks.find((t) => t.id === id) ?? null;
}

const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 } as const;

function byDueThenPriority(a: TaskItem, b: TaskItem): number {
  const openA = a.status === "done" ? 1 : 0;
  const openB = b.status === "done" ? 1 : 0;
  if (openA !== openB) return openA - openB;
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate && !b.dueDate) return -1;
  if (!a.dueDate && b.dueDate) return 1;
  return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
}

/* ---------- Projects ---------- */

export function projectsVisibleTo(viewer: PublicUser): Project[] {
  const projects = read().projects;
  if (viewer.role === "admin") return [...projects].sort(byProjectStatus);
  return projects
    .filter((p) => p.memberIds.includes(viewer.id) || p.leadId === viewer.id)
    .sort(byProjectStatus);
}

export function allProjects(): Project[] {
  return [...read().projects].sort(byProjectStatus);
}

export function projectById(id: string): Project | null {
  return read().projects.find((p) => p.id === id) ?? null;
}

const PROJECT_WEIGHT = { active: 0, review: 1, planning: 2, complete: 3 } as const;

function byProjectStatus(a: Project, b: Project): number {
  return PROJECT_WEIGHT[a.status] - PROJECT_WEIGHT[b.status] || a.dueDate.localeCompare(b.dueDate);
}

export function projectMap(): Map<string, Project> {
  return new Map(read().projects.map((p) => [p.id, p]));
}

/* ---------- Time ---------- */

export function timeEntriesFor(userId: string): TimeEntry[] {
  return read()
    .timeEntries.filter((t) => t.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export function timeEntriesVisibleTo(viewer: PublicUser): TimeEntry[] {
  return read()
    .timeEntries.filter((t) => canSee(viewer, t.userId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The entry currently clocked in, if any. */
export function runningEntry(userId: string): TimeEntry | null {
  return read().timeEntries.find((t) => t.userId === userId && t.startedAt) ?? null;
}

export interface WeekSummary {
  start: string;
  days: string[];
  entries: TimeEntry[];
  totalHours: number;
  byDay: Record<string, number>;
  status: "empty" | "draft" | "submitted" | "approved" | "mixed";
}

export function weekSummaryFor(userId: string, start = weekStart()): WeekSummary {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const end = days[6];
  const entries = read()
    .timeEntries.filter((t) => t.userId === userId && t.date >= start && t.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byDay: Record<string, number> = {};
  for (const d of days) byDay[d] = 0;
  let total = 0;
  for (const e of entries) {
    byDay[e.date] = (byDay[e.date] ?? 0) + e.hours;
    total += e.hours;
  }

  const statuses = new Set(entries.map((e) => e.status));
  const status: WeekSummary["status"] =
    entries.length === 0 ? "empty"
    : statuses.size > 1 ? "mixed"
    : (statuses.values().next().value as WeekSummary["status"]);

  return { start, days, entries, totalHours: total, byDay, status };
}

export function totalApprovedHours(userId: string): number {
  return read()
    .timeEntries.filter((t) => t.userId === userId && t.status === "approved")
    .reduce((sum, t) => sum + t.hours, 0);
}

/* ---------- Submissions ---------- */

export function submissionsFor(userId: string): Submission[] {
  return read()
    .submissions.filter((s) => s.userId === userId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function submissionsVisibleTo(viewer: PublicUser): Submission[] {
  return read()
    .submissions.filter((s) => canSee(viewer, s.userId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function submissionById(id: string): Submission | null {
  return read().submissions.find((s) => s.id === id) ?? null;
}

/* ---------- Studio content ---------- */

export function announcementsFor(viewer: PublicUser): Announcement[] {
  return read()
    .announcements.filter((a) => a.audience === "all" || a.audience === viewer.role)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
}

export function recentAnnouncementCount(viewer: PublicUser, days = 7): number {
  const cutoff = Date.now() - days * 86_400_000;
  return announcementsFor(viewer).filter((a) => new Date(a.createdAt).getTime() > cutoff).length;
}

export function allResources(): Resource[] {
  return [...read().resources].sort(
    (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
  );
}

/* ---------- Review queue (mentors + admins) ---------- */

export interface ReviewQueue {
  submissions: Submission[];
  tasks: TaskItem[];
  timesheets: TimeEntry[];
  total: number;
}

export function reviewQueueFor(viewer: PublicUser): ReviewQueue {
  if (ROLE_RANK[viewer.role] < ROLE_RANK.mentor)
    return { submissions: [], tasks: [], timesheets: [], total: 0 };

  const scope = visibleUserIds(viewer);
  const mine = (ownerId: string) => (scope === null ? true : scope.has(ownerId) && ownerId !== viewer.id);
  const db = read();

  const submissions = db.submissions
    .filter((s) => s.status === "pending" && mine(s.userId))
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const tasks = db.tasks
    .filter((t) => t.status === "submitted" && mine(t.assigneeId))
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

  const timesheets = db.timeEntries
    .filter((t) => t.status === "submitted" && mine(t.userId))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    submissions,
    tasks,
    timesheets,
    total: submissions.length + tasks.length + timesheets.length,
  };
}

/* ---------- Navigation counts ---------- */

export function navCountsFor(viewer: PublicUser) {
  const own = tasksFor(viewer.id);
  const queue = reviewQueueFor(viewer);
  return {
    tasks: own.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "changes_requested")
      .length,
    submissions: submissionsFor(viewer.id).filter((s) => s.status === "changes_requested").length,
    timesheets: 0,
    approvals: queue.total,
  };
}

/* ---------- Onboarding ---------- */

export function onboardingProgress(user: PublicUser) {
  const done = ONBOARDING_STEPS.filter((s) => user.onboarding[s.key]).length;
  return {
    steps: ONBOARDING_STEPS.map((s) => ({ ...s, done: !!user.onboarding[s.key] })),
    done,
    total: ONBOARDING_STEPS.length,
    percent: Math.round((done / ONBOARDING_STEPS.length) * 100),
    complete: done === ONBOARDING_STEPS.length,
  };
}

/* ---------- Admin analytics ---------- */

export function studioStats() {
  const db = read();
  const interns = db.users.filter((u) => u.role === "intern");
  const openTasks = db.tasks.filter((t) => t.status !== "done");
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10));
  const approvedHours = db.timeEntries
    .filter((t) => t.status === "approved")
    .reduce((sum, t) => sum + t.hours, 0);
  const pendingHours = db.timeEntries
    .filter((t) => t.status === "submitted")
    .reduce((sum, t) => sum + t.hours, 0);
  const reviewed = db.submissions.filter((s) => s.rating !== null);
  const avgRating = reviewed.length
    ? reviewed.reduce((sum, s) => sum + (s.rating ?? 0), 0) / reviewed.length
    : 0;

  return {
    totalUsers: db.users.length,
    interns: interns.length,
    activeInterns: interns.filter((u) => u.status === "active").length,
    pendingUsers: db.users.filter((u) => u.status === "pending").length,
    projects: db.projects.length,
    activeProjects: db.projects.filter((p) => p.status === "active").length,
    openTasks: openTasks.length,
    overdueTasks: overdue.length,
    completedTasks: db.tasks.filter((t) => t.status === "done").length,
    approvedHours,
    pendingHours,
    pendingSubmissions: db.submissions.filter((s) => s.status === "pending").length,
    avgRating,
    openInvitations: db.invitations.filter(
      (i) => !i.acceptedAt && !i.revokedAt && new Date(i.expiresAt).getTime() > Date.now(),
    ).length,
  };
}

export function auditTrail(limit = 60) {
  return read().audit.slice(0, limit);
}

export function invitations() {
  return [...read().invitations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Hours logged per day over the last `days` days, for the dashboard sparkline. */
export function hoursSeries(userId: string, days = 14): { date: string; hours: number }[] {
  const start = addDays(new Date().toISOString().slice(0, 10), -(days - 1));
  const entries = read().timeEntries.filter((t) => t.userId === userId && t.date >= start);
  const series: { date: string; hours: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    series.push({ date, hours: entries.filter((e) => e.date === date).reduce((s, e) => s + e.hours, 0) });
  }
  return series;
}
