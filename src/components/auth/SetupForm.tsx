"use client";

import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { completeSetupAction } from "@/lib/auth/setup";
import { idleForm } from "@/lib/forms";

export function SetupForm({ tokenConfigured }: { tokenConfigured: boolean }) {
  const [state, action] = useActionState(completeSetupAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-3">
        <span className="eyebrow">First run</span>
        <h1 style={{ fontSize: "var(--step-4)" }}>Create the studio account</h1>
        <p className="muted t-sm">
          This portal is empty. Create the first administrator — this page seals itself permanently
          once that account exists.
        </p>
      </div>

      {!tokenConfigured ? (
        <Alert tone="warn">
          <span>
            <strong>SETUP_TOKEN is not set.</strong> Add it to your server environment (at least 8
            characters) and restart before you can finish setup.
          </span>
        </Alert>
      ) : null}

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <form action={action} className="stack g-4">
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="First name" name="firstName" error={state.fields?.firstName}>
            <input id="firstName" name="firstName" className="input" defaultValue={state.values?.firstName} required />
          </Field>
          <Field label="Last name" name="lastName" error={state.fields?.lastName}>
            <input id="lastName" name="lastName" className="input" defaultValue={state.values?.lastName} required />
          </Field>
        </div>

        <Field label="Your email" name="email" error={state.fields?.email} hint="You'll sign in with this.">
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            defaultValue={state.values?.email}
            required
          />
        </Field>

        <Field
          label="Password"
          name="password"
          error={state.fields?.password}
          hint="At least 10 characters, with a number."
        >
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" required />
        </Field>

        <Field
          label="Setup token"
          name="setupToken"
          error={state.fields?.setupToken}
          hint="The SETUP_TOKEN value from your server environment."
        >
          <input id="setupToken" name="setupToken" type="password" className="input mono" required />
        </Field>

        <Submit pendingLabel="Creating…" disabled={!tokenConfigured}>
          Create administrator
        </Submit>
      </form>
    </div>
  );
}
