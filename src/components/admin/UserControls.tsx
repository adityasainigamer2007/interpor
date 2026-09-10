"use client";

import { useTransition } from "react";

import { assignMentorAction, setUserRoleAction, setUserStatusAction } from "@/lib/actions/admin";
import type { PublicUser, Role, UserStatus } from "@/lib/db/schema";

export function RoleSelect({ userId, role }: { userId: string; role: Role }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="select"
      style={{ minHeight: 34, padding: "5px 32px 5px 10px", fontSize: "var(--step--2)" }}
      value={role}
      disabled={pending}
      aria-label="Role"
      onChange={(e) => {
        const next = e.target.value as Role;
        startTransition(() => setUserRoleAction(userId, next));
      }}
    >
      <option value="intern">Intern</option>
      <option value="mentor">Mentor</option>
      <option value="admin">Admin</option>
    </select>
  );
}

export function StatusControl({ userId, status }: { userId: string; status: UserStatus }) {
  const [pending, startTransition] = useTransition();
  const set = (next: UserStatus) => startTransition(() => setUserStatusAction(userId, next));

  return (
    <div className="row g-2" aria-busy={pending}>
      {status !== "active" ? (
        <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => set("active")}>
          {status === "pending" ? "Approve" : "Reinstate"}
        </button>
      ) : null}
      {status !== "suspended" ? (
        <button type="button" className="btn btn-sm btn-danger" disabled={pending} onClick={() => set("suspended")}>
          Suspend
        </button>
      ) : null}
    </div>
  );
}

export function MentorSelect({
  userId,
  mentorId,
  mentors,
}: {
  userId: string;
  mentorId: string | null;
  mentors: PublicUser[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="select"
      style={{ minHeight: 34, padding: "5px 32px 5px 10px", fontSize: "var(--step--2)" }}
      value={mentorId ?? ""}
      disabled={pending}
      aria-label="Mentor"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => assignMentorAction(userId, next));
      }}
    >
      <option value="">No mentor</option>
      {mentors.map((m) => (
        <option key={m.id} value={m.id}>
          {m.fullName}
        </option>
      ))}
    </select>
  );
}
