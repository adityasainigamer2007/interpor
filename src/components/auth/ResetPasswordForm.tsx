"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { resendCodeAction, resetPasswordAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";
import { CodeInput } from "./CodeInput";

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, action] = useActionState(resetPasswordAction, idleForm);
  const [resend, resendAction] = useActionState(resendCodeAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Set a new password</h1>
        <p className="muted t-sm">
          Enter the code we sent to{" "}
          <span className="medium" style={{ color: "var(--text)" }}>{email}</span> and choose a new password.
        </p>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {resend.status === "success" && resend.message ? <Alert tone="ok">{resend.message}</Alert> : null}

      <form action={action} className="stack g-5">
        <input type="hidden" name="email" value={email} />
        <CodeInput />

        <Field
          label="New password"
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

        <Submit pendingLabel="Updating…">Update password</Submit>
      </form>

      <div className="stack g-3" style={{ textAlign: "center" }}>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="purpose" value="password_reset" />
          <Submit className="btn btn-quiet btn-sm" pendingLabel="Sending…">
            Send another code
          </Submit>
        </form>
        <p className="t-sm muted">
          <Link href="/sign-in" className="link">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
