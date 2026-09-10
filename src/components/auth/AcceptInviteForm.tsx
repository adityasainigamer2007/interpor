"use client";

import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { acceptInvitationAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";
import type { Role } from "@/lib/db/schema";

export function AcceptInviteForm({
  token,
  email,
  role,
  firstName,
  lastName,
  invitedBy,
}: {
  token: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  invitedBy: string;
}) {
  const [state, action] = useActionState(acceptInvitationAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-3">
        <span className="eyebrow">You&apos;re invited</span>
        <h1 style={{ fontSize: "var(--step-4)" }}>Join the Ayava studio</h1>
        <p className="muted t-sm">
          {invitedBy} invited you to join as a{" "}
          <span className="medium" style={{ color: "var(--gold)" }}>{role}</span>. Set a password and
          you&apos;re in — no email verification needed.
        </p>
      </div>

      <div className="card pad-sm row g-3" style={{ background: "var(--glass)" }}>
        <span className="badge gold">{email}</span>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <form action={action} className="stack g-4">
        <input type="hidden" name="token" value={token} />

        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="First name" name="firstName" error={state.fields?.firstName}>
            <input
              id="firstName"
              name="firstName"
              className="input"
              autoComplete="given-name"
              defaultValue={state.values?.firstName ?? firstName}
              required
            />
          </Field>
          <Field label="Last name" name="lastName" error={state.fields?.lastName}>
            <input
              id="lastName"
              name="lastName"
              className="input"
              autoComplete="family-name"
              defaultValue={state.values?.lastName ?? lastName}
              required
            />
          </Field>
        </div>

        <Field
          label="Choose a password"
          name="password"
          error={state.fields?.password}
          hint="At least 10 characters, with a number."
        >
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="new-password"
            required
          />
        </Field>

        <Submit pendingLabel="Setting up…">Accept invitation</Submit>
      </form>
    </div>
  );
}
