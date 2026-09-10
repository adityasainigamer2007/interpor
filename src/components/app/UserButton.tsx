"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icons";
import type { PublicUser } from "@/lib/db/schema";
import { signOutAction } from "@/lib/auth/actions";

/**
 * The account menu — our equivalent of Clerk's `<UserButton />`.
 * Avatar trigger, profile summary, links to profile/settings, sign out.
 */
export function UserButton({ user }: { user: PublicUser }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="row g-2"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        style={{ padding: 3, borderRadius: 999, border: "1px solid var(--line)" }}
      >
        <span
          className="avatar sm"
          style={{
            background: `linear-gradient(145deg, ${user.avatarColor}, color-mix(in srgb, ${user.avatarColor} 45%, #0b0b0c))`,
            color: "#0b0b0c",
            borderColor: "transparent",
            fontWeight: 700,
          }}
        >
          {user.initials}
        </span>
        <Icon.chevron size={14} />
      </button>

      {open ? (
        <div className="menu" role="menu">
          <div className="menu-head row g-3">
            <span
              className="avatar"
              style={{
                background: `linear-gradient(145deg, ${user.avatarColor}, color-mix(in srgb, ${user.avatarColor} 45%, #0b0b0c))`,
                color: "#0b0b0c",
                borderColor: "transparent",
                fontWeight: 700,
              }}
            >
              {user.initials}
            </span>
            <span className="stack" style={{ minWidth: 0 }}>
              <span className="medium truncate">{user.fullName}</span>
              <span className="t-xs faint truncate">{user.email}</span>
            </span>
          </div>

          <Link href="/profile" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon.user size={16} /> Your profile
          </Link>
          <Link href="/settings" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon.settings size={16} /> Account settings
          </Link>
          {user.role === "admin" ? (
            <Link href="/admin" className="menu-item" role="menuitem" onClick={() => setOpen(false)}>
              <Icon.shield size={16} /> Admin console
            </Link>
          ) : null}

          <div className="menu-sep" />

          <form action={signOutAction}>
            <button type="submit" className="menu-item danger" role="menuitem" style={{ width: "100%" }}>
              <Icon.logout size={16} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
