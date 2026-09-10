"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icons";
import { Wordmark } from "./Wordmark";
import type { Role } from "@/lib/db/schema";

export interface NavCounts {
  tasks: number;
  submissions: number;
  timesheets: number;
  approvals: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: (p: { size?: number }) => ReactNode;
  minRole?: Role;
  count?: keyof NavCounts;
}

const RANK: Record<Role, number> = { intern: 1, mentor: 2, admin: 3 };

const WORK: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Icon.dashboard },
  { href: "/tasks", label: "Tasks", icon: Icon.tasks, count: "tasks" },
  { href: "/projects", label: "Projects", icon: Icon.projects },
  { href: "/timesheet", label: "Timesheet", icon: Icon.clock },
  { href: "/submissions", label: "Submissions", icon: Icon.upload, count: "submissions" },
];

const STUDIO: NavItem[] = [
  { href: "/announcements", label: "Announcements", icon: Icon.megaphone },
  { href: "/resources", label: "Resources", icon: Icon.book },
  { href: "/directory", label: "Directory", icon: Icon.users },
];

const REVIEW: NavItem[] = [
  { href: "/review", label: "Review queue", icon: Icon.check, minRole: "mentor", count: "approvals" },
];

const ADMIN: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Icon.chart, minRole: "admin" },
  { href: "/admin/users", label: "Users", icon: Icon.users, minRole: "admin" },
  { href: "/admin/invitations", label: "Invitations", icon: Icon.mail, minRole: "admin" },
  { href: "/admin/audit", label: "Audit log", icon: Icon.shield, minRole: "admin" },
];

export function Sidebar({
  role,
  counts,
  open,
  onClose,
}: {
  role: Role;
  counts: NavCounts;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  // Any navigation closes the mobile drawer.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const visible = (item: NavItem) => !item.minRole || RANK[role] >= RANK[item.minRole];

  const renderGroup = (title: string, items: NavItem[]) => {
    const allowed = items.filter(visible);
    if (!allowed.length) return null;
    return (
      <>
        <p className="side-group">{title}</p>
        {allowed.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const count = item.count ? counts[item.count] : 0;
          return (
            <Link key={item.href} href={item.href} className={active ? "side-link active" : "side-link"}>
              <item.icon size={17} />
              {item.label}
              {count > 0 ? <span className="side-badge tnum">{count}</span> : null}
            </Link>
          );
        })}
      </>
    );
  };

  return (
    <>
      {open ? <div className="scrim only-mobile" onClick={onClose} aria-hidden /> : null}
      <nav className={open ? "sidebar open" : "sidebar"} aria-label="Portal navigation">
        <div className="row between" style={{ padding: "4px 12px 10px" }}>
          <Wordmark href="/dashboard" />
          <button type="button" className="btn-icon only-mobile" onClick={onClose} aria-label="Close navigation">
            <Icon.x size={18} />
          </button>
        </div>

        {renderGroup("Your work", WORK)}
        {renderGroup("Studio", STUDIO)}
        {renderGroup("Mentoring", REVIEW)}
        {renderGroup("Administration", ADMIN)}

        <div className="mt-auto" style={{ paddingTop: 22 }}>
          <div
            className="card pad-sm"
            style={{ background: "var(--glass)", boxShadow: "none" }}
          >
            <p className="t-xs faint" style={{ lineHeight: 1.5 }}>
              Autumn 2026 cohort — twelve weeks, four disciplines. Ask your mentor anything.
            </p>
          </div>
        </div>
      </nav>
    </>
  );
}

/** Sidebar + mobile trigger, wired together. */
export function NavShell({
  role,
  counts,
  children,
}: {
  role: Role;
  counts: NavCounts;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app">
      <Sidebar role={role} counts={counts} open={open} onClose={() => setOpen(false)} />
      <div style={{ minWidth: 0 }}>
        <MobileTrigger onOpen={() => setOpen(true)} />
        {children}
      </div>
    </div>
  );
}

function MobileTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-icon btn-ghost only-mobile"
      onClick={onOpen}
      aria-label="Open navigation"
      style={{ position: "fixed", left: 14, top: 14, zIndex: 45, background: "var(--ink-800)" }}
    >
      <Icon.menu size={18} />
    </button>
  );
}
