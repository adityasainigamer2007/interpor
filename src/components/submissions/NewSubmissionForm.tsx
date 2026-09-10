"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { createSubmissionAction } from "@/lib/actions/submissions";
import { idleForm } from "@/lib/forms";
import type { Project, TaskItem } from "@/lib/db/schema";

/** Deliverables go in as links — Figma, Drive, Frame.io, a live URL. */
export function NewSubmissionForm({
  projects,
  tasks,
  defaultTaskId,
}: {
  projects: Project[];
  tasks: TaskItem[];
  defaultTaskId?: string;
}) {
  const [state, action] = useActionState(createSubmissionAction, idleForm);
  const [linkCount, setLinkCount] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setLinkCount(1);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="stack g-4">
      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field label="Title" name="title" error={state.fields?.title}>
        <input id="title" name="title" className="input" placeholder="Wordmark directions — round 2" required />
      </Field>

      <Field label="Notes for your reviewer" name="description" hint="What you'd like them to look at, and anything you're unsure about.">
        <textarea id="description" name="description" className="textarea" rows={3} />
      </Field>

      <div className="grid grid-2" style={{ gap: 14 }}>
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

        <Field label="Against a task" name="taskId" hint="Submitting moves the task into review.">
          <select id="taskId" name="taskId" className="select" defaultValue={defaultTaskId ?? ""}>
            <option value="">Not linked to a task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="stack g-3">
        <span className="label">Links to the work</span>
        {Array.from({ length: linkCount }, (_, i) => (
          <div key={i} className="row g-2 wrap">
            <input
              name={`label${i}`}
              className="input"
              placeholder="Label (Figma)"
              style={{ flex: "0 1 150px", minWidth: 120 }}
            />
            <input
              name={`url${i}`}
              type="url"
              className="input grow"
              placeholder="https://…"
              required={i === 0}
              style={{ minWidth: 180 }}
            />
          </div>
        ))}
        {state.fields?.url0 ? <span className="error-text">{state.fields.url0}</span> : null}
        {linkCount < 4 ? (
          <button type="button" className="btn btn-quiet btn-sm" style={{ width: "fit-content" }} onClick={() => setLinkCount((n) => n + 1)}>
            <Icon.plus size={14} /> Add another link
          </button>
        ) : null}
      </div>

      <Submit className="btn btn-primary btn-block" pendingLabel="Submitting…">
        Submit for review
      </Submit>
    </form>
  );
}
