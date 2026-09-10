"use client";

import { useTransition } from "react";

import { Icon } from "@/components/ui/Icons";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/lib/auth/actions";
import { relativeTime } from "@/lib/format";
import type { Session } from "@/lib/db/schema";

/** Active devices, with per-session revoke — Clerk's "sessions" panel. */
export function SessionList({ sessions, currentId }: { sessions: Session[]; currentId: string }) {
  const [pending, startTransition] = useTransition();
  const others = sessions.filter((s) => s.id !== currentId);

  return (
    <div className="stack g-4" aria-busy={pending}>
      {sessions.map((session) => {
        const isCurrent = session.id === currentId;
        return (
          <div key={session.id} className="row between g-3 wrap">
            <div className="row g-3" style={{ minWidth: 0 }}>
              <span
                className="row center"
                style={{
                  width: 34,
                  height: 34,
                  flex: "none",
                  borderRadius: 9,
                  border: "1px solid var(--line-strong)",
                  background: isCurrent ? "var(--gold-wash)" : "var(--glass)",
                  color: isCurrent ? "var(--gold)" : "var(--text-dim)",
                }}
              >
                <Icon.shield size={16} />
              </span>
              <div className="stack" style={{ minWidth: 0 }}>
                <span className="t-sm medium truncate">
                  {session.device}
                  {isCurrent ? <span className="badge gold" style={{ marginLeft: 8 }}>This device</span> : null}
                </span>
                <span className="t-xs faint truncate">
                  {session.ip} · last active {relativeTime(session.lastActiveAt)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-quiet"
              disabled={pending}
              onClick={() => startTransition(() => revokeSessionAction(session.id))}
            >
              {isCurrent ? "Sign out" : "Revoke"}
            </button>
          </div>
        );
      })}

      {others.length ? (
        <>
          <hr className="rule" />
          <button
            type="button"
            className="btn btn-danger btn-sm"
            style={{ width: "fit-content" }}
            disabled={pending}
            onClick={() => startTransition(() => revokeOtherSessionsAction())}
          >
            Sign out of {others.length} other {others.length === 1 ? "device" : "devices"}
          </button>
        </>
      ) : null}
    </div>
  );
}
