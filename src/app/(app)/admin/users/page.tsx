import type { Metadata } from "next";
import Link from "next/link";

import { MentorSelect, RoleSelect, StatusControl } from "@/components/admin/UserControls";
import { Avatar } from "@/components/ui/Avatar";
import { UserStatusBadge } from "@/components/ui/Badges";
import { EmptyState, PageHeader, Stat } from "@/components/ui/Page";
import { requireRole } from "@/lib/auth/guards";
import { formatDate, relativeTime } from "@/lib/format";
import { allUsers, mentors } from "@/lib/queries";

export const metadata: Metadata = { title: "Users" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "" } = await searchParams;
  const { user: viewer } = await requireRole("admin");

  const everyone = allUsers();
  const people = status ? everyone.filter((u) => u.status === status) : everyone;
  const mentorList = mentors();

  return (
    <div className="stack g-5">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Everyone with an account. Approve applications, set roles and assign mentors."
        actions={
          <Link href="/admin/invitations" className="btn btn-primary btn-sm">
            Invite someone
          </Link>
        }
      />

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Total" value={everyone.length} />
        </div>
        <div className="card">
          <Stat label="Pending" value={everyone.filter((u) => u.status === "pending").length} gold />
        </div>
        <div className="card">
          <Stat label="Active" value={everyone.filter((u) => u.status === "active").length} />
        </div>
        <div className="card">
          <Stat label="Suspended" value={everyone.filter((u) => u.status === "suspended").length} />
        </div>
      </section>

      <div className="tabs">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value ? `/admin/users?status=${filter.value}` : "/admin/users"}
            className={status === filter.value ? "tab active" : "tab"}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <section className="panel rise">
        <div className="table-wrap">
          <table className="table" style={{ minWidth: 940 }}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Mentor</th>
                <th>Status</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id}>
                  <td>
                    <Link href={`/admin/users/${person.id}`} className="row g-3" style={{ minWidth: 0 }}>
                      <Avatar name={person.fullName} color={person.avatarColor} size="sm" />
                      <span className="stack" style={{ minWidth: 0 }}>
                        <span className="medium truncate">
                          {person.fullName}
                          {person.id === viewer.id ? <span className="badge gold" style={{ marginLeft: 8 }}>You</span> : null}
                        </span>
                        <span className="t-xs faint truncate">{person.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <RoleSelect userId={person.id} role={person.role} />
                  </td>
                  <td>
                    {person.role === "intern" ? (
                      <MentorSelect userId={person.id} mentorId={person.mentorId} mentors={mentorList} />
                    ) : (
                      <span className="faint t-xs">—</span>
                    )}
                  </td>
                  <td>
                    <UserStatusBadge status={person.status} />
                  </td>
                  <td className="nowrap muted">
                    {person.lastSignInAt ? relativeTime(person.lastSignInAt) : `Joined ${formatDate(person.createdAt)}`}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <StatusControl userId={person.id} status={person.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!people.length ? <EmptyState title="Nobody matches that filter" /> : null}
      </section>
    </div>
  );
}
