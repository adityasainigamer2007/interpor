"use client";

import { useTransition } from "react";

import { Icon } from "@/components/ui/Icons";
import { deleteTimeEntryAction, submitWeekAction } from "@/lib/actions/time";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-icon btn-quiet"
      aria-label="Delete entry"
      disabled={pending}
      onClick={() => startTransition(() => deleteTimeEntryAction(entryId))}
    >
      {pending ? <span className="spinner" /> : <Icon.x size={15} />}
    </button>
  );
}

export function SubmitWeekButton({ weekStart, count }: { weekStart: string; count: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-primary"
      disabled={pending || count === 0}
      onClick={() => startTransition(() => submitWeekAction(weekStart))}
    >
      {pending ? <span className="spinner" /> : <Icon.check size={16} />}
      Submit {count} {count === 1 ? "entry" : "entries"}
    </button>
  );
}
