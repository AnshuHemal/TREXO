import type { Metadata } from "next";
import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { ForgotPasswordForm } from "./_components/forgot-password-form";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Forgot password",
  description: `Reset your ${siteConfig.name} account password.`,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  return (
    // Suspense boundary required because ForgotPasswordForm reads useSearchParams()
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
