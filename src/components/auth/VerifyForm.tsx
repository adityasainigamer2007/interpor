"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { resendCodeAction, verifyEmailAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";
import { CodeInput } from "./CodeInput";

export function VerifyForm({ email }: { email: string }) {
  const [state, action] = useActionState(verifyEmailAction, idleForm);
  const [resend, resendAction] = useActionState(resendCodeAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Check your email</h1>
        <p className="muted t-sm">
          We sent a six-digit code to <span className="medium" style={{ color: "var(--text)" }}>{email}</span>.
          It expires in 15 minutes.
        </p>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}
      {resend.status === "success" && resend.message ? <Alert tone="ok">{resend.message}</Alert> : null}
      {resend.status === "error" && resend.message ? <Alert tone="warn">{resend.message}</Alert> : null}

      <form action={action} className="stack g-5">
        <input type="hidden" name="email" value={email} />
        <CodeInput />
        <Submit pendingLabel="Verifying…">Verify email</Submit>
      </form>

      <div className="stack g-3" style={{ textAlign: "center" }}>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="purpose" value="email_verification" />
          <Submit className="btn btn-quiet btn-sm" pendingLabel="Sending…">
            Didn&apos;t get it? Send another code
          </Submit>
        </form>

        <p className="hint">
          In development, codes are printed to the server console and saved to{" "}
          <code className="mono">data/outbox.json</code>.
        </p>

        <p className="t-sm muted">
          Wrong address?{" "}
          <Link href="/sign-up" className="link">
            Start again
          </Link>
        </p>
      </div>
    </div>
  );
}
