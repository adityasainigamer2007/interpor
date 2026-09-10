/** Domain model for the Ayava Creatives intern portal. */

export type Role = "admin" | "mentor" | "intern";

export const ROLES: Role[] = ["admin", "mentor", "intern"];

/** Role ranking — higher outranks lower. Used by `Protect` and `requireRole`. */
export const ROLE_RANK: Record<Role, number> = { intern: 1, mentor: 2, admin: 3 };

export type UserStatus = "pending" | "active" | "suspended";

export interface User {
  id: string;
  email: string;
  /** scrypt digest — never leaves the server. */
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  /** Public profile */
  title: string;
  bio: string;
  avatarColor: string;
  discipline: string;
  cohort: string;
  mentorId: string | null;
  location: string;
  links: { label: string; url: string }[];
  onboarding: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
}

/** A public-safe projection of `User` — this is what ever reaches the client. */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  title: string;
  bio: string;
  avatarColor: string;
  discipline: string;
  cohort: string;
  mentorId: string | null;
  location: string;
  links: { label: string; url: string }[];
  onboarding: Record<string, boolean>;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  userAgent: string;
  ip: string;
  device: string;
  revokedAt: string | null;
}

/** Short-lived one-time codes: email verification and password reset. */
export type CodePurpose = "email_verification" | "password_reset";

export interface VerificationCode {
  id: string;
  userId: string;
  purpose: CodePurpose;
  /** HMAC of the 6-digit code — the plaintext is only ever emailed. */
  codeHash: string;
  expiresAt: string;
  attempts: number;
  consumedAt: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  /** HMAC of the raw token; the raw token only exists in the invite link. */
  tokenHash: string;
  firstName: string;
  lastName: string;
  discipline: string;
  cohort: string;
  mentorId: string | null;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export type ProjectStatus = "planning" | "active" | "review" | "complete";

export interface Project {
  id: string;
  name: string;
  client: string;
  summary: string;
  status: ProjectStatus;
  leadId: string;
  memberIds: string[];
  startDate: string;
  dueDate: string;
  createdAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "submitted" | "changes_requested" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  projectId: string | null;
  assigneeId: string;
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  estimateHours: number | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  /** Mentor sign-off */
  approvedBy: string | null;
  approvedAt: string | null;
  comments: TaskComment[];
}

export interface TaskComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export interface TimeEntry {
  id: string;
  userId: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  projectId: string | null;
  taskId: string | null;
  hours: number;
  note: string;
  status: TimesheetStatus;
  /** Set while a shift is running; cleared when clocked out. */
  startedAt: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  createdAt: string;
}

export type SubmissionStatus = "pending" | "approved" | "changes_requested";

export interface Submission {
  id: string;
  userId: string;
  taskId: string | null;
  projectId: string | null;
  title: string;
  description: string;
  /** Deliverables are links (Figma, Drive, Frame.io …) — no binary uploads. */
  links: { label: string; url: string }[];
  status: SubmissionStatus;
  submittedAt: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  rating: number | null;
  feedback: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorId: string;
  pinned: boolean;
  audience: Role | "all";
  createdAt: string;
}

export type ResourceKind = "doc" | "link" | "video" | "template" | "brand";

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  kind: ResourceKind;
  category: string;
  addedBy: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  actorEmail: string;
  action: string;
  target: string;
  meta: Record<string, string>;
  ip: string;
  createdAt: string;
}

/** The whole datastore. One JSON document; see `store.ts`. */
export interface Database {
  users: User[];
  sessions: Session[];
  codes: VerificationCode[];
  invitations: Invitation[];
  projects: Project[];
  tasks: TaskItem[];
  timeEntries: TimeEntry[];
  submissions: Submission[];
  announcements: Announcement[];
  resources: Resource[];
  audit: AuditEvent[];
}

export const EMPTY_DB: Database = {
  users: [],
  sessions: [],
  codes: [],
  invitations: [],
  projects: [],
  tasks: [],
  timeEntries: [],
  submissions: [],
  announcements: [],
  resources: [],
  audit: [],
};

/** The onboarding checklist every intern works through in week one. */
export const ONBOARDING_STEPS: { key: string; label: string; hint: string; href: string }[] = [
  {
    key: "profile",
    label: "Complete your profile",
    hint: "Add your discipline, a short bio and your portfolio links.",
    href: "/profile",
  },
  {
    key: "brand",
    label: "Read the Ayava brand book",
    hint: "How we write, design and present work to clients.",
    href: "/resources",
  },
  {
    key: "tools",
    label: "Get access to the toolkit",
    hint: "Figma, Drive and the shared asset library.",
    href: "/resources",
  },
  {
    key: "mentor",
    label: "Meet your mentor",
    hint: "Book your first 1:1 and agree on your goals.",
    href: "/directory",
  },
  {
    key: "first_task",
    label: "Pick up your first task",
    hint: "Move something into In Progress on your board.",
    href: "/tasks",
  },
  {
    key: "first_log",
    label: "Log your first hours",
    hint: "Clock in, or add a manual entry to this week's timesheet.",
    href: "/timesheet",
  },
];

export function toPublicUser(u: User): PublicUser {
  const { passwordHash: _omit, updatedAt: _omit2, ...rest } = u;
  return {
    ...rest,
    fullName: `${u.firstName} ${u.lastName}`.trim(),
    initials: `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase(),
  };
}
