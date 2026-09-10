import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Apply" };

export default function SignUpPage() {
  return <SignUpForm />;
}
