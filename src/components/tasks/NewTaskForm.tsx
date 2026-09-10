"use client";

import { useActionState, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { createTaskAction } from "@/lib/actions/tasks";
import { idleForm } from "@/lib/forms";
import type { Project, PublicUser } from "@/lib/db/schema";

/** Mentor/admin-only task assignment, tucked behind a disclosure. */
export function NewTaskForm({ people, projects }: { people: PublicUser[]; projects: Project[] }) {
  const [state, action] = useActionState(createTaskAction, idleForm);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="row end">
        <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon.plus size={16} /> Assign a task
        </button>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Assign a task</h3>
        <button type="button" className="btn btn-icon btn-quiet" onClick={() => setOpen(false)} aria-label="Close">
          <Icon.x size={17} />
        </button>
      </div>

      <form action={action} className="panel-body stack g-4">
        {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
        {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

        <Field label="Title" name="title" error={state.fields?.title}>
          <input id="title" name="title" className="input" placeholder="What needs doing?" required />
        </Field>

        <Field label="Brief" name="description" hint="Enough detail that they can start without asking.">
          <textarea id="description" name="description" className="textarea" rows={4} />
        </Field>

        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Assign to" name="assigneeId" error={state.fields?.assigneeId}>
            <select id="assigneeId" name="assigneeId" className="select" required defaultValue="">
              <option value="" disabled>
                Choose someone
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} — {p.discipline || p.role}
                </option>
              ))}
            </select>
          </Field>

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

          <Field label="Priority" name="priority">
            <select id="priority" name="priority" className="select" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>

          <Field label="Due date" name="dueDate">
            <input id="dueDate" name="dueDate" type="date" className="input" />
          </Field>

          <Field label="Estimate (hours)" name="estimateHours">
            <input id="estimateHours" name="estimateHours" type="number" min="0" step="0.5" className="input" />
          </Field>

          <Field label="Tags" name="tags" hint="Comma separated.">
            <input id="tags" name="tags" className="input" placeholder="identity, print" />
          </Field>
        </div>

        <div className="row g-3">
          <Submit className="btn btn-primary" pendingLabel="Assigning…">
            Assign task
          </Submit>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
