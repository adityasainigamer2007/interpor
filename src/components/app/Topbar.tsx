import Link from "next/link";

import { Icon } from "@/components/ui/Icons";
import type { PublicUser } from "@/lib/db/schema";
import { UserButton } from "./UserButton";

/** Slim context bar above every page: where you are, what's new, who you are. */
export function Topbar({
  user,
  unreadAnnouncements,
}: {
  user: PublicUser;
  unreadAnnouncements: number;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <header className="topbar">
      <div className="stack" style={{ minWidth: 0 }}>
        <span className="t-sm medium truncate">
          {greeting}, {user.firstName}
        </span>
        <span className="t-xs faint truncate">{date}</span>
      </div>

      <div className="row g-3 mt-auto" style={{ marginLeft: "auto", marginTop: 0 }}>
        <Link
          href="/announcements"
          className="btn btn-icon btn-quiet relative"
          aria-label={`Announcements${unreadAnnouncements ? `, ${unreadAnnouncements} recent` : ""}`}
        >
          <Icon.megaphone size={18} />
          {unreadAnnouncements > 0 ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "var(--gold)",
                boxShadow: "0 0 0 2px var(--ink-900)",
              }}
            />
          ) : null}
        </Link>
        <UserButton user={user} />
      </div>
    </header>
  );
}
