import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/SignInForm";
import { setupRequired } from "@/lib/auth/setup";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  // A brand-new install has nobody to sign in as — send them to first-run setup.
  if (await setupRequired()) redirect("/setup");

  const { redirect_url } = await searchParams;
  return <SignInForm redirectUrl={redirect_url} />;
}
