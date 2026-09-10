import type {
  ProjectStatus,
  Role,
  SubmissionStatus,
  TaskPriority,
  TaskStatus,
  TimesheetStatus,
  UserStatus,
} from "@/lib/db/schema";

type Tone = "" | "gold" | "ok" | "warn" | "danger" | "info";

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={tone ? `badge ${tone}` : "badge"}>{children}</span>;
}

const TASK_STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  todo: { label: "To do", tone: "" },
  in_progress: { label: "In progress", tone: "info" },
  submitted: { label: "In review", tone: "warn" },
  changes_requested: { label: "Changes requested", tone: "danger" },
  done: { label: "Done", tone: "ok" },
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { label, tone } = TASK_STATUS[status];
  return (
    <Pill tone={tone}>
      <i className="dot" />
      {label}
    </Pill>
  );
}

const PRIORITY: Record<TaskPriority, { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warn" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, tone } = PRIORITY[priority];
  return <Pill tone={tone}>{label} priority</Pill>;
}

const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planning: { label: "Planning", tone: "" },
  active: { label: "Active", tone: "ok" },
  review: { label: "In review", tone: "warn" },
  complete: { label: "Complete", tone: "info" },
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const { label, tone } = PROJECT_STATUS[status];
  return (
    <Pill tone={tone}>
      <i className="dot" />
      {label}
    </Pill>
  );
}

const TIMESHEET_STATUS: Record<TimesheetStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "" },
  submitted: { label: "Awaiting approval", tone: "warn" },
  approved: { label: "Approved", tone: "ok" },
  rejected: { label: "Returned", tone: "danger" },
};

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  const { label, tone } = TIMESHEET_STATUS[status];
  return <Pill tone={tone}>{label}</Pill>;
}

const SUBMISSION_STATUS: Record<SubmissionStatus, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting review", tone: "warn" },
  approved: { label: "Approved", tone: "ok" },
  changes_requested: { label: "Changes requested", tone: "danger" },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { label, tone } = SUBMISSION_STATUS[status];
  return (
    <Pill tone={tone}>
      <i className="dot" />
      {label}
    </Pill>
  );
}

const ROLE_LABEL: Record<Role, { label: string; tone: Tone }> = {
  admin: { label: "Admin", tone: "gold" },
  mentor: { label: "Mentor", tone: "info" },
  intern: { label: "Intern", tone: "" },
};

export function RoleBadge({ role }: { role: Role }) {
  const { label, tone } = ROLE_LABEL[role];
  return <Pill tone={tone}>{label}</Pill>;
}

const USER_STATUS: Record<UserStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending approval", tone: "warn" },
  active: { label: "Active", tone: "ok" },
  suspended: { label: "Suspended", tone: "danger" },
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { label, tone } = USER_STATUS[status];
  return (
    <Pill tone={tone}>
      <i className="dot" />
      {label}
    </Pill>
  );
}
