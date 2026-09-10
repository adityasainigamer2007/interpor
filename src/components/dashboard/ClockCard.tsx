"use client";

import { useActionState, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icons";
import { Submit } from "@/components/ui/Submit";
import { clockInAction, clockOutAction } from "@/lib/actions/time";
import { idleForm } from "@/lib/forms";
import type { Project } from "@/lib/db/schema";

function elapsed(since: string): string {
  const ms = Math.max(0, Date.now() - new Date(since).getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Clock in/out with a live timer — the fastest way to log a session. */
export function ClockCard({ startedAt, projects }: { startedAt: string | null; projects: Project[] }) {
  const [state, action] = useActionState(clockOutAction, idleForm);
  const [tick, setTick] = useState(() => (startedAt ? elapsed(startedAt) : "00:00:00"));

  useEffect(() => {
    if (!startedAt) return;
    setTick(elapsed(startedAt));
    const timer = setInterval(() => setTick(elapsed(startedAt)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <div className="card stack g-4">
        <div className="row between g-3">
          <span className="stat-label">Time tracking</span>
          <Icon.clock size={17} />
        </div>
        <p className="t-sm muted">You&apos;re not clocked in. Start a session and it lands in this week&apos;s timesheet.</p>
        <form action={clockInAction}>
          <Submit className="btn btn-primary btn-block" pendingLabel="Starting…">
            <Icon.play size={15} /> Clock in
          </Submit>
        </form>
      </div>
    );
  }

  return (
    <div className="card accent stack g-4">
      <div className="row between g-3">
        <span className="stat-label" style={{ color: "var(--gold)" }}>
          Clocked in
        </span>
        <span className="row g-2 t-xs" style={{ color: "var(--gold)" }}>
          <i className="dot" style={{ animation: "glow-pulse 1.8s var(--ease) infinite" }} />
          Live
        </span>
      </div>

      <span className="mono tnum" style={{ fontSize: "var(--step-4)", letterSpacing: "-0.02em" }}>
        {tick}
      </span>

      <form action={action} className="stack g-3">
        <select name="projectId" className="select" defaultValue="" aria-label="Project">
          <option value="">No project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input name="note" className="input" placeholder="What did you work on?" maxLength={140} />
        <Submit className="btn btn-ghost btn-block" pendingLabel="Saving…">
          <Icon.stop size={15} /> Clock out
        </Submit>
        {state.status === "error" && state.message ? <p className="error-text">{state.message}</p> : null}
      </form>
    </div>
  );
}
