import Link from "next/link";

import { Icon } from "@/components/ui/Icons";
import { toggleOnboardingStepAction } from "@/lib/actions/profile";

interface Step {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

/** Week-one checklist. Ticking a step is a server action, no client JS needed. */
export function OnboardingCard({ steps, done, total, percent }: { steps: Step[]; done: number; total: number; percent: number }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div className="stack g-1">
          <h3>Getting started</h3>
          <span className="t-xs faint">
            {done} of {total} done
          </span>
        </div>
        <div className="ring" style={{ ["--p" as string]: percent, ["--size" as string]: "58px" }}>
          <span className="t-xs semibold">{percent}%</span>
        </div>
      </div>

      <div className="panel-body stack g-2">
        {steps.map((step) => (
          <div key={step.key} className="row g-3" style={{ padding: "7px 0" }}>
            <form
              action={async () => {
                "use server";
                await toggleOnboardingStepAction(step.key);
              }}
            >
              <button
                type="submit"
                aria-label={step.done ? `Mark "${step.label}" as not done` : `Mark "${step.label}" as done`}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: `1px solid ${step.done ? "var(--gold)" : "var(--line-strong)"}`,
                  background: step.done ? "var(--gold)" : "transparent",
                  color: step.done ? "#16130a" : "transparent",
                }}
              >
                <Icon.check size={12} />
              </button>
            </form>

            <div className="stack" style={{ minWidth: 0 }}>
              <Link
                href={step.href}
                className="t-sm medium truncate"
                style={{
                  color: step.done ? "var(--text-faint)" : "var(--text)",
                  textDecoration: step.done ? "line-through" : "none",
                }}
              >
                {step.label}
              </Link>
              {!step.done ? <span className="t-xs faint">{step.hint}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
