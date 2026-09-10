import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="row between wrap g-4 rise" style={{ marginBottom: 30, alignItems: "flex-end" }}>
      <div className="stack g-2" style={{ minWidth: 0 }}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 style={{ fontSize: "var(--step-4)" }}>{title}</h1>
        {description ? (
          <p className="muted" style={{ maxWidth: "58ch" }}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="row g-3 wrap">{actions}</div>
      ) : null}
    </header>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="glyph" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </span>
      <p className="medium" style={{ color: "var(--text)" }}>
        {title}
      </p>
      {description ? (
        <p className="t-sm" style={{ maxWidth: "42ch" }}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  meta,
  gold,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  gold?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={gold ? "stat-value gold" : "stat-value"}>{value}</span>
      {meta ? <span className="stat-meta">{meta}</span> : null}
    </div>
  );
}

export function Progress({ value, max = 100, thick }: { value: number; max?: number; thick?: boolean }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={thick ? "progress thick" : "progress"}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
