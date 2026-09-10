"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { changePasswordAction } from "@/lib/actions/profile";
import { idleForm } from "@/lib/forms";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, idleForm);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="stack g-4">
      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? <Alert tone="ok">{state.message}</Alert> : null}

      <Field label="Current password" name="currentPassword" error={state.fields?.currentPassword}>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </Field>

      <Field
        label="New password"
        name="newPassword"
        error={state.fields?.newPassword}
        hint="At least 10 characters, with a number. Every other device gets signed out."
      >
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          required
        />
      </Field>

      <div className="row">
        <Submit className="btn btn-primary" pendingLabel="Updating…">
          Update password
        </Submit>
      </div>
    </form>
  );
}
