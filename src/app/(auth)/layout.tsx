import { Wordmark } from "@/components/app/Wordmark";

const MARKS = [
  "Brand & Identity",
  "Motion / Film",
  "Content & Social",
  "Digital & Web",
  "Photography",
];

/** Split layout shared by every credential screen. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <div style={{ position: "relative", zIndex: 1 }}>
          <Wordmark sub="Intern Portal" />
        </div>

        <blockquote className="auth-quote">
          The work you do here goes to <em className="gold-em">real clients</em>. That&apos;s the
          whole point.
        </blockquote>

        <div className="stack g-3" style={{ position: "relative", zIndex: 1 }}>
          <span className="eyebrow no-rule">Disciplines</span>
          <div className="row wrap g-2">
            {MARKS.map((m) => (
              <span key={m} className="badge">
                {m}
              </span>
            ))}
          </div>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card rise">{children}</div>
      </main>
    </div>
  );
}
