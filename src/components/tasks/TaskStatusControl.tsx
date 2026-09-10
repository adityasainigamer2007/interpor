"use client";

import { useTransition } from "react";

import type { TaskStatus } from "@/lib/db/schema";
import { updateTaskStatusAction } from "@/lib/actions/tasks";

const OWNER_FLOW: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "Submit for review" },
];

const REVIEWER_EXTRA: { value: TaskStatus; label: string }[] = [
  { value: "changes_requested", label: "Request changes" },
  { value: "done", label: "Approve as done" },
];

/** Status switcher — an intern moves work along; a mentor also signs it off. */
export function TaskStatusControl({
  taskId,
  status,
  canReview,
}: {
  taskId: string;
  status: TaskStatus;
  canReview: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const options = canReview ? [...OWNER_FLOW, ...REVIEWER_EXTRA] : OWNER_FLOW;

  return (
    <div className="row g-2 wrap" aria-busy={pending}>
      {options.map((option) => {
        const active = option.value === status;
        return (
          <button
            key={option.value}
            type="button"
            disabled={pending || active}
            className={active ? "btn btn-sm btn-primary" : "btn btn-sm btn-ghost"}
            onClick={() => startTransition(() => updateTaskStatusAction(taskId, option.value))}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
