"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const VIEWS = [
  { value: "", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "submitted", label: "In review" },
  { value: "changes_requested", label: "Changes" },
  { value: "done", label: "Done" },
];

export function TaskFilters({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("status", value);
    else next.delete("status");
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  return (
    <div className="tabs" role="tablist" aria-label="Filter tasks by status">
      {VIEWS.map((view) => (
        <button
          key={view.value}
          type="button"
          role="tab"
          aria-selected={active === view.value}
          className={active === view.value ? "tab active" : "tab"}
          onClick={() => go(view.value)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
