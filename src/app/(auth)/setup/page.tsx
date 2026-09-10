import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SetupForm } from "@/components/auth/SetupForm";
import { setupRequired, setupTokenConfigured } from "@/lib/auth/setup";

export const metadata: Metadata = { title: "Set up the portal" };
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await setupRequired())) redirect("/sign-in");
  return <SetupForm tokenConfigured={await setupTokenConfigured()} />;
}
