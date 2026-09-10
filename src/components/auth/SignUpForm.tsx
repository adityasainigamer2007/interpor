"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert, Field } from "@/components/ui/Field";
import { Submit } from "@/components/ui/Submit";
import { signUpAction } from "@/lib/auth/actions";
import { idleForm } from "@/lib/forms";

const DISCIPLINES = [
  "Brand & Identity",
  "Motion / Film",
  "Content & Social",
  "Digital & Web",
  "Photography",
];

/** Cheap, honest strength signal — mirrors the server's `validatePassword`. */
function strengthOf(password: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^\w\s]/.test(password)) score += 1;

  if (!password) return { score: 0, label: "", tone: "var(--ink-700)" };
  if (score <= 2) return { score, label: "Weak", tone: "var(--danger)" };
  if (score === 3) return { score, label: "Fair", tone: "var(--warn)" };
  if (score === 4) return { score, label: "Strong", tone: "var(--ok)" };
  return { score, label: "Excellent", tone: "var(--gold)" };
}

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, idleForm);
  const [password, setPassword] = useState("");
  const strength = strengthOf(password);

  return (
    <div className="stack g-5">
      <div className="stack g-2">
        <h1 style={{ fontSize: "var(--step-4)" }}>Apply to the programme</h1>
        <p className="muted t-sm">
          Two minutes. We review applications weekly and email you either way.
        </p>
      </div>

      {state.status === "error" && state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <form action={action} className="stack g-4">
        <div className="grid grid-2" style={{ gap: 14 }}>
          <Field label="First name" name="firstName" error={state.fields?.firstName}>
            <input
              id="firstName"
              name="firstName"
              className="input"
              autoComplete="given-name"
              defaultValue={state.values?.firstName}
              required
            />
          </Field>
          <Field label="Last name" name="lastName" error={state.fields?.lastName}>
            <input
              id="lastName"
              name="lastName"
              className="input"
              autoComplete="family-name"
              defaultValue={state.values?.lastName}
              required
            />
          </Field>
        </div>

        <Field label="Email address" name="email" error={state.fields?.email}>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state.values?.email}
            required
          />
        </Field>

        <Field label="Discipline" name="discipline" error={state.fields?.discipline} hint="The closest one — you won't be held to it.">
          <select id="discipline" name="discipline" className="select" defaultValue={state.values?.discipline ?? ""} required>
            <option value="" disabled>
              Choose a discipline
            </option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Password"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {password ? (
          <div className="row g-3">
            <div className="progress grow" aria-hidden>
              <span
                style={{
                  width: `${(strength.score / 5) * 100}%`,
                  background: strength.tone,
                }}
              />
            </div>
            <span className="t-xs" style={{ color: strength.tone, minWidth: 62 }}>
              {strength.label}
            </span>
          </div>
        ) : null}

        <Submit pendingLabel="Creating your account…">Create account</Submit>

        <p className="hint" style={{ textAlign: "center" }}>
          By applying you agree to the studio handbook and our handling of your details.
        </p>
      </form>

      <p className="t-sm muted" style={{ textAlign: "center" }}>
        Already have an account?{" "}
        <Link href="/sign-in" className="link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
