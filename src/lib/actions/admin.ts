"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "../auth/guards";
import { recordAudit, revokeAllSessions } from "../auth/session";
import { mutate, id, now, read } from "../db/store";
import type { ProjectStatus, Role, UserStatus } from "../db/schema";
import { formError, formSuccess, str, type FormState } from "../forms";
import { safeUrl } from "../format";

/* ---------- People ---------- */

export async function setUserRoleAction(userId: string, role: Role): Promise<void> {
  const { user } = await requireRole("admin");
  if (!["admin", "mentor", "intern"].includes(role)) return;

  // Guard against an admin removing the last admin — including themselves.
  if (role !== "admin") {
    const admins = read().users.filter((u) => u.role === "admin" && u.status !== "suspended");
    if (admins.length <= 1 && admins[0]?.id === userId) return;
  }

  const email = mutate((db) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return null;
    target.role = role;
    target.updatedAt = now();
    return target.email;
  });

  if (!email) return;
  await recordAudit("user.role_changed", email, { role, by: user.email });
  revalidatePath("/admin/users");
  revalidatePath("/directory");
}

export async function setUserStatusAction(userId: string, status: UserStatus): Promise<void> {
  const { user } = await requireRole("admin");
  if (!["pending", "active", "suspended"].includes(status)) return;

  if (status === "suspended") {
    const admins = read().users.filter((u) => u.role === "admin" && u.status === "active");
    if (admins.length <= 1 && admins[0]?.id === userId) return;
  }

  const email = mutate((db) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return null;
    target.status = status;
    target.updatedAt = now();
    return target.email;
  });

  if (!email) return;

  // Suspension takes effect immediately, everywhere.
  if (status === "suspended") revokeAllSessions(userId);

  await recordAudit("user.status_changed", email, { status, by: user.email });
  revalidatePath("/admin/users");
  revalidatePath("/directory");
}

export async function assignMentorAction(userId: string, mentorId: string): Promise<void> {
  await requireRole("admin");

  const email = mutate((db) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return null;
    target.mentorId = mentorId || null;
    target.updatedAt = now();
    return target.email;
  });

  if (!email) return;
  await recordAudit("user.mentor_assigned", email, { mentorId });
  revalidatePath("/admin/users");
  revalidatePath("/directory");
}

export async function updateUserDetailsAction(_prev: FormState, data: FormData): Promise<FormState> {
  await requireRole("admin");

  const userId = str(data, "userId");
  const cohort = str(data, "cohort");
  const discipline = str(data, "discipline");
  const title = str(data, "title");

  const email = mutate((db) => {
    const target = db.users.find((u) => u.id === userId);
    if (!target) return null;
    Object.assign(target, { cohort, discipline, title, updatedAt: now() });
    return target.email;
  });

  if (!email) return formError("That user no longer exists.");
  await recordAudit("user.details_updated", email);
  revalidatePath(`/admin/users/${userId}`);
  return formSuccess("Saved.");
}

/* ---------- Announcements ---------- */

export async function createAnnouncementAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireRole("mentor");

  const title = str(data, "title");
  const body = str(data, "body");
  const audience = (str(data, "audience") || "all") as Role | "all";
  const pinned = str(data, "pinned") === "on";

  const fields: Record<string, string> = {};
  if (!title) fields.title = "Give it a title.";
  if (!body) fields.body = "Write the announcement.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  mutate((db) =>
    db.announcements.unshift({
      id: id("ann"),
      title,
      body,
      authorId: user.id,
      pinned,
      audience,
      createdAt: now(),
    }),
  );

  await recordAudit("announcement.created", title, { audience });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return formSuccess("Announcement posted.");
}

export async function deleteAnnouncementAction(announcementId: string): Promise<void> {
  const { user } = await requireRole("mentor");

  const title = mutate((db) => {
    const index = db.announcements.findIndex((a) => a.id === announcementId);
    if (index === -1) return null;
    // Mentors can only remove their own; admins can remove any.
    if (user.role !== "admin" && db.announcements[index].authorId !== user.id) return null;
    return db.announcements.splice(index, 1)[0].title;
  });

  if (!title) return;
  await recordAudit("announcement.deleted", title);
  revalidatePath("/announcements");
}

/* ---------- Resources ---------- */

export async function createResourceAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireRole("mentor");

  const title = str(data, "title");
  const description = str(data, "description");
  const rawUrl = str(data, "url");
  const kind = str(data, "kind") || "link";
  const category = str(data, "category") || "Studio";

  const fields: Record<string, string> = {};
  if (!title) fields.title = "Give it a title.";
  const url = safeUrl(rawUrl);
  if (!url) fields.url = "Enter a valid http(s) link.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  mutate((db) =>
    db.resources.push({
      id: id("res"),
      title,
      description,
      url: url as string,
      kind: kind as "doc" | "link" | "video" | "template" | "brand",
      category,
      addedBy: user.id,
      createdAt: now(),
    }),
  );

  await recordAudit("resource.created", title);
  revalidatePath("/resources");
  return formSuccess("Resource added.");
}

export async function deleteResourceAction(resourceId: string): Promise<void> {
  await requireRole("admin");

  const title = mutate((db) => {
    const index = db.resources.findIndex((r) => r.id === resourceId);
    return index === -1 ? null : db.resources.splice(index, 1)[0].title;
  });

  if (!title) return;
  await recordAudit("resource.deleted", title);
  revalidatePath("/resources");
}

/* ---------- Projects ---------- */

export async function createProjectAction(_prev: FormState, data: FormData): Promise<FormState> {
  const { user } = await requireRole("mentor");

  const name = str(data, "name");
  const client = str(data, "client");
  const summary = str(data, "summary");
  const status = (str(data, "status") || "planning") as ProjectStatus;
  const startDate = str(data, "startDate");
  const dueDate = str(data, "dueDate");
  const memberIds = data.getAll("memberIds").filter((v): v is string => typeof v === "string");

  const fields: Record<string, string> = {};
  if (!name) fields.name = "Give the project a name.";
  if (!client) fields.client = "Who's it for?";
  if (dueDate && startDate && dueDate < startDate) fields.dueDate = "The due date is before the start.";
  if (Object.keys(fields).length) return formError("Check the highlighted fields.", fields);

  mutate((db) =>
    db.projects.push({
      id: id("prj"),
      name,
      client,
      summary,
      status,
      leadId: user.id,
      memberIds: Array.from(new Set([user.id, ...memberIds])),
      startDate: startDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      createdAt: now(),
    }),
  );

  await recordAudit("project.created", name, { client });
  revalidatePath("/projects");
  return formSuccess(`"${name}" created.`);
}

export async function setProjectStatusAction(projectId: string, status: ProjectStatus): Promise<void> {
  await requireRole("mentor");

  const name = mutate((db) => {
    const project = db.projects.find((p) => p.id === projectId);
    if (!project) return null;
    project.status = status;
    return project.name;
  });

  if (!name) return;
  await recordAudit("project.status_changed", name, { status });
  revalidatePath("/projects");
}
