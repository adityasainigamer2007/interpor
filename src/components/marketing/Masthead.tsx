"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/app/Wordmark";

/** Marketing header — goes opaque once the hero scrolls past. */
export function Masthead({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "masthead scrolled" : "masthead"}>
      <div className="shell masthead-inner">
        <Wordmark />
        <nav className="row g-3">
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Open the portal
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="btn btn-quiet btn-sm">
                Sign in
              </Link>
              <Link href="/sign-up" className="btn btn-primary btn-sm">
                Apply to the programme
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
