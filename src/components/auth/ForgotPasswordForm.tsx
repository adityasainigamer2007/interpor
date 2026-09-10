"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Reset your password</h1>
        <p className="muted t-sm">
          Enter your email and we&apos;ll send a six-digit code to set a new one.
        </p>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <form action={action} className="stack g-4">
        <Field label="Email address" name="email" error={state.fields?.email}>
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
        <Submit pendingLabel="Sending…">Send reset code</Submit>
      </form>

      <p className="t-sm muted" style={{ textAlign: "center" }}>
        Remembered it?{" "}
        <Link href="/sign-in" className="link">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
