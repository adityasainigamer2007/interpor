"use client";

import { useFormStatus } from "react-dom";

/** Submit button that shows a spinner while its form's action is in flight. */
export function Submit({
  children,
  pendingLabel,
  className = "btn btn-primary btn-block",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? (
        <>
          <span className="spinner" aria-hidden />
          {pendingLabel ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
