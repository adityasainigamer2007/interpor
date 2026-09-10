import type { ReactNode } from "react";

export function Field({
  label,
  name,
  error,
  hint,
  children,
  action,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="field">
      <div className="row between g-3">
        <label className="label" htmlFor={name}>
          {label}
        </label>
        {action}
      </div>
      {children}
      {error && error.trim() ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </div>
  );
}

export function Alert({ tone, children }: { tone: "error" | "ok" | "info" | "warn"; children: ReactNode }) {
  return (
    <div className={`alert alert-${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{children}</span>
    </div>
  );
}
