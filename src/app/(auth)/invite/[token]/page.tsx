import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { hmac, safeEqual } from "@/lib/auth/crypto";
import { read } from "@/lib/db/store";
import { userById } from "@/lib/queries";

export const metadata: Metadata = { title: "Accept your invitation" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = hmac(`invite:${token}`);
  const invitation = read().invitations.find((i) => safeEqual(i.tokenHash, tokenHash));

  const problem =
    !invitation ? "We don't recognise this invitation link."
    : invitation.revokedAt ? "This invitation was withdrawn."
    : invitation.acceptedAt ? "This invitation has already been used."
    : new Date(invitation.expiresAt).getTime() < Date.now() ? "This invitation has expired."
    : null;

  if (problem || !invitation) {
    return (
      <div className="stack g-5">
        <div className="stack g-2">
          <h1 style={{ fontSize: "var(--step-4)" }}>Invitation unavailable</h1>
          <p className="muted t-sm">{problem}</p>
        </div>
        <div className="alert alert-warn">
          Ask the studio to send you a fresh invitation — links are valid for 14 days.
        </div>
        <Link href="/sign-in" className="btn btn-ghost btn-block">
          Back to sign in
        </Link>
      </div>
    );
  }

  const inviter = userById(invitation.invitedBy);

  return (
    <AcceptInviteForm
      token={token}
      email={invitation.email}
      role={invitation.role}
      firstName={invitation.firstName}
      lastName={invitation.lastName}
      invitedBy={inviter?.fullName ?? "The studio"}
    />
  );
}
