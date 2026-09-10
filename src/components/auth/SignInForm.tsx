"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { signInAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";

const DEMO_ACCOUNTS = [
  { email: "studio@ayavacreatives.com", label: "Studio Director", role: "Admin" },
  { email: "priya@ayavacreatives.com", label: "Priya Raghavan", role: "Mentor" },
  { email: "arjun@ayavacreatives.com", label: "Arjun Kapoor", role: "Intern" },
];
const DEMO_PASSWORD = "AyavaStudio2026";

export function SignInForm({ redirectUrl }: { redirectUrl?: string }) {
  const [state, action] = useActionState(signInAction, idleForm);
  const [email, setEmail] = useState(state.values?.email ?? "");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(false);

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <Submit pendingLabel="Signing in…">Sign in</Submit>
      </form>

      <p className="t-sm muted" style={{ textAlign: "center" }}>
        New to the studio?{" "}
        <Link href="/sign-up" className="link">
          Apply to the programme
        </Link>
      </p>

      <div className="stack g-3">
        <div className="or">Demo</div>
        {showDemo ? (
          <div className="demo-list">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="demo-row"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                <span className="badge gold">{a.role}</span>
                <span className="stack" style={{ minWidth: 0 }}>
                  <span className="medium truncate" style={{ color: "var(--text)" }}>
                    {a.label}
                  </span>
                  <span className="t-xs faint truncate">{a.email}</span>
                </span>
              </button>
            ))}
            <p className="hint" style={{ textAlign: "center", marginTop: 4 }}>
              Fills the form — press Sign in to continue.
            </p>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={() => setShowDemo(true)}>
            Use a demo account
          </button>
        )}
      </div>
    </div>
  );
}
