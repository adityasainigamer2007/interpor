"use client";

import { useTransition } from "react";

import { Icon } from "@/components/ui/Icons";
import { reviewTaskAction } from "@/lib/actions/tasks";
import { approveAllForUserAction, reviewTimeEntryAction } from "@/lib/actions/time";

export function TaskReviewButtons({ taskId }: { taskId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="row g-2" aria-busy={pending}>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        disabled={pending}
        onClick={() => startTransition(() => reviewTaskAction(taskId, false))}
      >
        Send back
      </button>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={pending}
        onClick={() => startTransition(() => reviewTaskAction(taskId, true))}
      >
        <Icon.check size={14} /> Sign off
      </button>
    </div>
  );
}

export function TimeReviewButtons({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="row g-2" aria-busy={pending}>
      <button
        type="button"
        className="btn btn-icon btn-quiet"
        aria-label="Return entry"
        disabled={pending}
        onClick={() => startTransition(() => reviewTimeEntryAction(entryId, false))}
      >
        <Icon.x size={15} />
      </button>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-label="Approve entry"
        disabled={pending}
        onClick={() => startTransition(() => reviewTimeEntryAction(entryId, true))}
      >
        <Icon.check size={15} />
      </button>
    </div>
  );
}

export function ApproveAllButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      disabled={pending}
      onClick={() => startTransition(() => approveAllForUserAction(userId))}
    >
      {pending ? <span className="spinner" /> : <Icon.check size={14} />}
      Approve all for {name}
    </button>
  );
}
