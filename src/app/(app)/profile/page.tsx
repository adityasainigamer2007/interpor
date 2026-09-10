import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/components/account/ProfileForm";
import { Avatar } from "@/components/ui/Avatar";
import { RoleBadge } from "@/components/ui/Badges";
import { PageHeader, Progress, Stat } from "@/components/ui/Page";
import { requireAuth } from "@/lib/auth/guards";
import { formatDate, formatHours } from "@/lib/format";
import {
  onboardingProgress,
  submissionsFor,
  tasksFor,
  totalApprovedHours,
  userById,
} from "@/lib/queries";

export const metadata: Metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const { user } = await requireAuth();

  const mentor = user.mentorId ? userById(user.mentorId) : null;
  const tasks = tasksFor(user.id);
  const submissions = submissionsFor(user.id);
  const reviewed = submissions.filter((s) => s.rating !== null);
  const avg = reviewed.length ? reviewed.reduce((sum, s) => sum + (s.rating ?? 0), 0) / reviewed.length : null;
  const onboarding = onboardingProgress(user);

  return (
    <div className="stack g-5">
      <PageHeader eyebrow="Your account" title="Profile" description="How you appear to the studio and the rest of the cohort." />

      <section className="card pad-lg row between wrap g-5 rise">
        <div className="row g-4 wrap" style={{ minWidth: 0 }}>
          <Avatar name={user.fullName} color={user.avatarColor} size="xl" />
          <div className="stack g-2" style={{ minWidth: 0 }}>
            <div className="row g-2 wrap">
              <RoleBadge role={user.role} />
              {user.cohort ? <span className="badge">{user.cohort}</span> : null}
            </div>
            <h2 style={{ fontSize: "var(--step-3)" }}>{user.fullName}</h2>
            <p className="t-sm" style={{ color: "var(--gold)" }}>
              {user.title || user.discipline || "Studio"}
            </p>
            <p className="t-xs faint">{user.email}</p>
          </div>
        </div>

        {mentor ? (
          <div className="stack g-2">
            <span className="stat-label">Your mentor</span>
            <Link href="/directory" className="row g-3">
              <Avatar name={mentor.fullName} color={mentor.avatarColor} />
              <span className="stack">
                <span className="t-sm medium">{mentor.fullName}</span>
                <span className="t-xs faint">{mentor.title}</span>
              </span>
            </Link>
          </div>
        ) : null}
      </section>

      <section className="grid grid-4 rise">
        <div className="card">
          <Stat label="Hours approved" value={formatHours(totalApprovedHours(user.id))} gold />
        </div>
        <div className="card">
          <Stat label="Tasks completed" value={tasks.filter((t) => t.status === "done").length} meta={`of ${tasks.length} assigned`} />
        </div>
        <div className="card">
          <Stat label="Average rating" value={avg ? avg.toFixed(1) : "—"} meta={`${reviewed.length} reviewed`} />
        </div>
        <div className="card">
          <Stat label="Onboarding" value={`${onboarding.percent}%`} meta={`${onboarding.done} of ${onboarding.total} steps`} />
          <div style={{ marginTop: 12 }}>
            <Progress value={onboarding.percent} />
          </div>
        </div>
      </section>

      <div className="split">
        <section className="panel rise">
          <div className="panel-head">
            <h3>Edit your details</h3>
          </div>
          <div className="panel-body">
            <ProfileForm user={user} />
          </div>
        </section>

        <aside className="stack g-4">
          <section className="panel rise">
            <div className="panel-head">
              <h3 style={{ fontSize: "var(--step-0)" }}>Account</h3>
            </div>
            <div className="panel-body stack g-4">
              <div className="row between g-3">
                <span className="t-xs faint">Joined</span>
                <span className="t-sm">{formatDate(user.createdAt)}</span>
              </div>
              <div className="row between g-3">
                <span className="t-xs faint">Email verified</span>
                <span className="badge ok">
                  <i className="dot" /> Verified
                </span>
              </div>
              <div className="row between g-3">
                <span className="t-xs faint">Cohort</span>
                <span className="t-sm">{user.cohort || "—"}</span>
              </div>
              <hr className="rule" />
              <Link href="/settings" className="btn btn-ghost btn-sm btn-block">
                Security settings
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
