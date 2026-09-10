"use client";

import { useTransition } from "react";

import { revokeInvitationAction } from "@/lib/auth/actions";

export function RevokeInviteButton({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-quiet"
      disabled={pending}
      onClick={() => startTransition(() => revokeInvitationAction(invitationId))}
    >
      {pending ? <span className="spinner" /> : "Revoke"}
    </button>
  );
}
