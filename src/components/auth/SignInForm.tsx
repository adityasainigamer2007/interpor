"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { signInAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";

export function SignInForm({ redirectUrl }: { redirectUrl?: string }) {
  const [state, action] = useActionState(signInAction, idleForm);

  return (
    <div className="stack g-5">
      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Welcome back</h1>
        <p className="muted t-sm">Sign in to pick up where you left off.</p>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <form action={action} className="stack g-4">
        <input type="hidden" name="redirect_url" value={redirectUrl ?? ""} />

        <Field label="Email address" name="email" error={state.fields?.email}>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@ayavacreatives.com"
            defaultValue={state.values?.email}
            required
          />
        </Field>

        <Field
          label="Password"
          name="password"
          error={state.fields?.password}
          action={
            <Link href="/forgot-password" className="link t-xs">
              Forgot?
            </Link>
          }
        >
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            autoComplete="current-password"
            required
          />
        </Field>

        <Submit pendingLabel="Signing in…">Sign in</Submit>
      </form>

      <p className="t-sm muted" style={{ textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="link">
          Apply to the programme
        </Link>
      </p>
    </div>
  );
}
