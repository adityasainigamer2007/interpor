import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyForm } from "@/components/auth/VerifyForm";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  if (!email) redirect("/sign-in");
  return <VerifyForm email={email} />;
}
