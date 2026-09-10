"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { createResourceAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/forms";

export function NewResourceForm({ categories }: { categories: string[] }) {
  const [state, action] = useActionState(createResourceAction, idleForm);
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
          <Icon.plus size={16} /> Add a resource
        </button>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Add a resource</h3>
        <button type="button" className="btn btn-icon btn-quiet" onClick={() => setOpen(false)} aria-label="Close">
          <Icon.x size={17} />
        </button>
      </div>

      <form ref={formRef} action={action} className="panel-body stack g-4">
        {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <Field label="Title" name="title" error={state.fields?.title}>
          <input id="title" name="title" className="input" required />
        </Field>

        <Field label="Link" name="url" error={state.fields?.url}>
          <input id="url" name="url" type="url" className="input" placeholder="https://…" required />
        </Field>

        <Field label="Description" name="description">
          <input id="description" name="description" className="input" maxLength={180} />
        </Field>

        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Type" name="kind">
            <select id="kind" name="kind" className="select" defaultValue="link">
              <option value="doc">Document</option>
              <option value="link">Link</option>
              <option value="video">Video</option>
              <option value="template">Template</option>
              <option value="brand">Brand</option>
            </select>
          </Field>

          <Field label="Category" name="category">
            <input
              id="category"
              name="category"
              className="input"
              list="resource-categories"
              defaultValue="Studio"
            />
          </Field>
        </div>

        <datalist id="resource-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="row g-3">
          <Submit className="btn btn-primary" pendingLabel="Adding…">
            Add resource
          </Submit>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
