import Link from "next/link";

import { Masthead } from "@/components/marketing/Masthead";
import { Icon } from "@/components/ui/Icons";
import { auth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: Icon.tasks,
    title: "Briefs, not busywork",
    copy: "Every task you're given is real client work with a due date, a mentor and a standard it has to meet. You'll always know what you're on and why it matters.",
  },
  {
    icon: Icon.clock,
    title: "Hours that count",
    copy: "Clock in against a project or log the week by hand. Your mentor approves it, the studio invoices against it, and your total follows you to your reference.",
  },
  {
    icon: Icon.upload,
    title: "Feedback in writing",
    copy: "Submit a deliverable and get a rating and written notes back — not a nod in the corridor. Everything is kept, so you can see how far you've come.",
  },
  {
    icon: Icon.book,
    title: "The studio's playbook",
    copy: "The brand book, the print specs, the templates and the handbook. Everything the full-time team uses, open to you from day one.",
  },
];

const STEPS = [
  { n: "01", title: "Apply", copy: "Tell us who you are and which discipline you're chasing. Two minutes, no portfolio upload." },
  { n: "02", title: "Verify", copy: "Confirm your email with a six-digit code so we know we can reach you." },
  { n: "03", title: "Get approved", copy: "The studio reviews applications weekly and activates your account with a mentor attached." },
  { n: "04", title: "Start the work", copy: "Onboarding checklist, first brief, first crit. You'll be on live work inside a week." },
];

export default async function LandingPage() {
  const session = await auth();

  return (
    <>
      <Masthead signedIn={!!session} />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="shell" style={{ paddingBlock: "clamp(64px, 11vw, 150px)" }}>
          <div className="stack g-6" style={{ maxWidth: 900 }}>
            <span className="eyebrow rise">Ayava Creatives · Internship Programme</span>

            <h1 className="display rise" style={{ ["--d" as string]: "0.08s" }}>
              Where the next
              <br />
              <em>Ayava</em> generation
              <br />
              learns the craft.
            </h1>

            <p className="lede rise" style={{ ["--d" as string]: "0.16s" }}>
              This is the private workspace for our interns — briefs, hours, deliverables and
              feedback in one place, run to the same standard as the client work that comes out
              of the studio.
            </p>

            <div className="row g-3 wrap rise" style={{ ["--d" as string]: "0.24s" }}>
              {session ? (
                <Link href="/dashboard" className="btn btn-primary btn-lg">
                  Open the portal <Icon.arrow size={17} />
                </Link>
              ) : (
                <>
                  <Link href="/sign-up" className="btn btn-primary btn-lg">
                    Apply to the programme <Icon.arrow size={17} />
                  </Link>
                  <Link href="/sign-in" className="btn btn-ghost btn-lg">
                    I already have an account
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Cohort figures */}
          <div
            className="grid grid-4 rise"
            style={{ marginTop: "clamp(56px, 8vw, 96px)", ["--d" as string]: "0.32s" }}
          >
            {[
              { v: "12", l: "Week programme" },
              { v: "4", l: "Disciplines" },
              { v: "1:1", l: "Mentor to intern" },
              { v: "100%", l: "Live client work" },
            ].map((s) => (
              <div key={s.l} className="stack g-2">
                <span className="stat-value gold" style={{ fontSize: "var(--step-4)" }}>
                  {s.v}
                </span>
                <span className="stat-label">{s.l}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="shell">
          <hr className="rule" />
        </div>

        {/* ---------- What you get ---------- */}
        <section className="shell section">
          <div className="stack g-4" style={{ maxWidth: 720, marginBottom: 54 }}>
            <span className="eyebrow">What the portal gives you</span>
            <h2>
              Everything an intern needs, and <em className="gold-em">nothing</em> they don&apos;t.
            </h2>
          </div>

          <div className="grid grid-2">
            {PILLARS.map((p, i) => (
              <article
                key={p.title}
                className="card pad-lg rise"
                style={{ ["--d" as string]: `${i * 0.07}s` }}
              >
                <span
                  className="row center"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid var(--line-strong)",
                    background: "var(--gold-wash)",
                    color: "var(--gold)",
                    marginBottom: 18,
                  }}
                >
                  <p.icon size={19} />
                </span>
                <h3 style={{ fontSize: "var(--step-2)", marginBottom: 10 }}>{p.title}</h3>
                <p className="muted t-sm" style={{ lineHeight: 1.7 }}>
                  {p.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="shell section" style={{ paddingTop: 0 }}>
          <div className="card pad-lg" style={{ borderRadius: "var(--r-xl)" }}>
            <div className="stack g-3" style={{ maxWidth: 620, marginBottom: 40 }}>
              <span className="eyebrow">Getting in</span>
              <h2 style={{ fontSize: "var(--step-3)" }}>Four steps from application to first brief.</h2>
            </div>

            <div className="grid grid-4">
              {STEPS.map((s) => (
                <div key={s.n} className="stack g-3">
                  <span
                    className="mono"
                    style={{ color: "var(--gold)", fontSize: "var(--step--1)", letterSpacing: "0.1em" }}
                  >
                    {s.n}
                  </span>
                  <hr className="rule" style={{ margin: 0 }} />
                  <h4 style={{ fontSize: "var(--step-1)" }}>{s.title}</h4>
                  <p className="t-sm muted" style={{ lineHeight: 1.65 }}>
                    {s.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="shell" style={{ paddingBottom: "clamp(70px, 10vw, 130px)" }}>
          <div
            className="card accent pad-lg row between wrap g-5"
            style={{ borderRadius: "var(--r-xl)", padding: "clamp(30px, 5vw, 60px)" }}
          >
            <div className="stack g-3" style={{ maxWidth: 540 }}>
              <h2 style={{ fontSize: "var(--step-3)" }}>
                Applications for the next cohort are <em className="gold-em">open</em>.
              </h2>
              <p className="muted">
                Four disciplines, twelve weeks, live client work from week one. Tell us what you
                want to get good at.
              </p>
            </div>
            <div className="row g-3 wrap">
              <Link href="/sign-up" className="btn btn-primary btn-lg">
                Apply now <Icon.arrow size={17} />
              </Link>
              <Link href="/sign-in" className="btn btn-ghost btn-lg">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <div className="shell row between wrap g-4" style={{ paddingBlock: 34 }}>
          <div className="stack g-2">
            <span className="wordmark" style={{ fontSize: "var(--step-1)" }}>
              Ayava<span className="mark">.</span>
            </span>
            <p className="t-xs faint">
              Intern Portal — a private system for the Ayava Creatives internship programme.
            </p>
          </div>
          <p className="t-xs faint">© {new Date().getFullYear()} Ayava Creatives. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
