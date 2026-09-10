"use client";

import { useActionState, useEffect, useRef } from "react";

import { Submit } from "@/components/ui/Submit";
import { addTaskCommentAction } from "@/lib/actions/tasks";
import { idleForm } from "@/lib/forms";

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, action] = useActionState(addTaskCommentAction, idleForm);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="stack g-3">
      <input type="hidden" name="taskId" value={taskId} />
      <textarea
        name="body"
        className="textarea"
        rows={3}
        placeholder="Ask a question, or say where you've got to…"
        required
        maxLength={4000}
      />
      <div className="row between g-3">
        {state.status === "error" && state.message ? (
          <span className="error-text">{state.message}</span>
        ) : (
          <span className="hint">Everyone on this task can see your comment.</span>
        )}
        <Submit className="btn btn-primary btn-sm" pendingLabel="Posting…">
          Post comment
        </Submit>
      </div>
    </form>
  );
}
