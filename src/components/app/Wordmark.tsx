import Link from "next/link";

/** The Ayava lockup, used in the masthead, the sidebar and the auth pages. */
export function Wordmark({ href = "/", sub = "Intern Portal" }: { href?: string; sub?: string | null }) {
  return (
    <Link href={href} className="wordmark" aria-label={`Ayava Creatives — ${sub ?? "home"}`}>
      <span>
        Ayava<span className="mark">.</span>
      </span>
      {sub ? <span className="sub">{sub}</span> : null}
    </Link>
  );
}
