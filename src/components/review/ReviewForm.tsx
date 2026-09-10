"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { reviewSubmissionAction } from "@/lib/actions/submissions";
import { idleForm } from "@/lib/forms";

/** Rate, write feedback, approve or send back — in one pass. */
export function ReviewForm({ submissionId }: { submissionId: string }) {
  const [state, action] = useActionState(reviewSubmissionAction, idleForm);
  const [rating, setRating] = useState(0);
  const [decision, setDecision] = useState<"approve" | "changes">("approve");

  return (
    <form action={action} className="stack g-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="rating" value={rating || ""} />

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <div className="row between g-3 wrap">
        <div className="row g-2" role="radiogroup" aria-label="Rating out of five">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} out of 5`}
              onClick={() => setRating(value === rating ? 0 : value)}
              style={{ color: value <= rating ? "var(--gold)" : "var(--ink-650)", lineHeight: 0 }}
            >
              <Icon.star size={19} />
            </button>
          ))}
        </div>

        <div className="tabs">
          <button
            type="button"
            className={decision === "approve" ? "tab active" : "tab"}
            onClick={() => setDecision("approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className={decision === "changes" ? "tab active" : "tab"}
            onClick={() => setDecision("changes")}
          >
            Request changes
          </button>
        </div>
      </div>

      <textarea
        name="feedback"
        className="textarea"
        rows={3}
        required
        placeholder={
          decision === "approve"
            ? "What worked, and what to carry into the next piece…"
            : "What specifically needs to change, and why…"
        }
      />

      <Submit className="btn btn-primary btn-sm" pendingLabel="Sending…">
        {decision === "approve" ? "Approve and send feedback" : "Send back with notes"}
      </Submit>
    </form>
  );
}
