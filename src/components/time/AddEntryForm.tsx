"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { addTimeEntryAction } from "@/lib/actions/time";
import { idleForm } from "@/lib/forms";
import type { Project } from "@/lib/db/schema";

export function AddEntryForm({ projects, today }: { projects: Project[]; today: string }) {
  const [state, action] = useActionState(addTimeEntryAction, idleForm);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="stack g-4">
      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Date" name="date" error={state.fields?.date}>
          <input id="date" name="date" type="date" className="input" defaultValue={today} max={today} required />
        </Field>
        <Field label="Hours" name="hours" error={state.fields?.hours}>
          <input
            id="hours"
            name="hours"
            type="number"
            className="input"
            step="0.25"
            min="0.25"
            max="16"
            placeholder="7.5"
            required
          />
        </Field>
      </div>

      <Field label="Project" name="projectId">
        <select id="projectId" name="projectId" className="select" defaultValue="">
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="What did you work on?" name="note">
        <input id="note" name="note" className="input" placeholder="Wordmark round 2" maxLength={140} />
      </Field>

      <Submit className="btn btn-primary btn-block" pendingLabel="Adding…">
        Add entry
      </Submit>
    </form>
  );
}
