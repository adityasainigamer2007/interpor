"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { createAnnouncementAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/forms";

export function NewAnnouncementForm() {
  const [state, action] = useActionState(createAnnouncementAction, idleForm);
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
          <Icon.plus size={16} /> Post an announcement
        </button>
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>New announcement</h3>
        <button type="button" className="btn btn-icon btn-quiet" onClick={() => setOpen(false)} aria-label="Close">
          <Icon.x size={17} />
        </button>
      </div>

      <form ref={formRef} action={action} className="panel-body stack g-4">
        {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

        <Field label="Title" name="title" error={state.fields?.title}>
          <input id="title" name="title" className="input" required />
        </Field>

        <Field label="Message" name="body" error={state.fields?.body}>
          <textarea id="body" name="body" className="textarea" rows={5} required />
        </Field>

        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="Who sees it" name="audience">
            <select id="audience" name="audience" className="select" defaultValue="all">
              <option value="all">Everyone</option>
              <option value="intern">Interns only</option>
              <option value="mentor">Mentors only</option>
              <option value="admin">Admins only</option>
            </select>
          </Field>

          <div className="field" style={{ justifyContent: "flex-end", paddingBottom: 12 }}>
            <label className="check">
              <input type="checkbox" name="pinned" />
              Pin to the top
            </label>
          </div>
        </div>

        <div className="row g-3">
          <Submit className="btn btn-primary" pendingLabel="Posting…">
            Post announcement
          </Submit>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
