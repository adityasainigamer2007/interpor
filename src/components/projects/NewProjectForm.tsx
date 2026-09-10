"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { createProjectAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/forms";
import type { PublicUser } from "@/lib/db/schema";

/** Mentor/admin-only project creation. */
export function NewProjectForm({ people }: { people: PublicUser[] }) {
  const [state, action] = useActionState(createProjectAction, idleForm);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <div className="row end">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon.plus size={16} /> New project
        </button>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>New project</h3>
        <button type="button" className="btn btn-icon btn-quiet" onClick={() => setOpen(false)} aria-label="Close">
          <Icon.x size={17} />
        </button>
      </div>

      <form ref={formRef} action={action} className="panel-body stack g-4">
        {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Project name" name="name" error={state.fields?.name}>
            <input id="name" name="name" className="input" placeholder="Growth engine — Q4" required />
          </Field>
          <Field label="Client" name="client" error={state.fields?.client}>
            <input id="client" name="client" className="input" placeholder="Client name" required />
          </Field>
        </div>

        <Field label="Summary" name="summary" hint="What the work is, in a sentence or two.">
          <textarea id="summary" name="summary" className="textarea" rows={3} />
        </Field>

        <div className="grid grid-3" style={{ gap: 14 }}>
          <Field label="Status" name="status">
            <select id="status" name="status" className="select" defaultValue="planning">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="review">In review</option>
              <option value="complete">Complete</option>
            </select>
          </Field>
          <Field label="Start date" name="startDate">
            <input id="startDate" name="startDate" type="date" className="input" />
          </Field>
          <Field label="Due date" name="dueDate" error={state.fields?.dueDate}>
            <input id="dueDate" name="dueDate" type="date" className="input" />
          </Field>
        </div>

        {people.length ? (
          <div className="stack g-3">
            <span className="label">Team</span>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {people.map((person) => (
                <label key={person.id} className="check">
                  <input type="checkbox" name="memberIds" value={person.id} />
                  <span>
                    {person.fullName}
                    <span className="faint"> · {person.discipline || person.role}</span>
                  </span>
                </label>
              ))}
            </div>
            <span className="hint">You&apos;re added as project lead automatically.</span>
          </div>
        ) : (
          <p className="hint">
            No other people yet — invite your team from the admin console and you can add them here.
          </p>
        )}

        <div className="row g-3">
          <Submit className="btn btn-primary" pendingLabel="Creating…">
            Create project
          </Submit>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
