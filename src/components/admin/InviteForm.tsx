"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { createInvitationAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";
import type { PublicUser } from "@/lib/db/schema";

export function InviteForm({ mentors }: { mentors: PublicUser[] }) {
  const [state, action] = useActionState(createInvitationAction, idleForm);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="stack g-4">
      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field label="Email address" name="email" error={state.fields?.email}>
        <input id="email" name="email" type="email" className="input" placeholder="them@example.com" required />
      </Field>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="First name" name="firstName">
          <input id="firstName" name="firstName" className="input" />
        </Field>
        <Field label="Last name" name="lastName">
          <input id="lastName" name="lastName" className="input" />
        </Field>
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Role" name="role">
          <select id="role" name="role" className="select" defaultValue="intern">
            <option value="intern">Intern</option>
            <option value="mentor">Mentor</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Mentor" name="mentorId">
          <select id="mentorId" name="mentorId" className="select" defaultValue="">
            <option value="">No mentor</option>
            {mentors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-2" style={{ gap: 14 }}>
        <Field label="Discipline" name="discipline">
          <input id="discipline" name="discipline" className="input" placeholder="Brand & Identity" />
        </Field>
        <Field label="Cohort" name="cohort">
          <input id="cohort" name="cohort" className="input" placeholder="Autumn 2026" />
        </Field>
      </div>

      <Submit className="btn btn-primary btn-block" pendingLabel="Sending…">
        Send invitation
      </Submit>
      <p className="hint">
        Invitations are valid for 14 days. Invited people skip email verification and land straight
        in the portal.
      </p>
    </form>
  );
}
