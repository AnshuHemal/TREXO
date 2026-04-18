import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";
import { LoginForm } from "./_components/login-form";
import { OAuthButtons } from "../_components/oauth-buttons";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Log in",
  description: `Log in to your ${siteConfig.name} account.`,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <FadeIn className="flex flex-col gap-6">

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card px-8 py-10 shadow-md">

        {/* Header */}
        <FadeIn direction="down" delay={0.05} className="mb-8 flex flex-col gap-1.5 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Log in to your {siteConfig.name} account
          </p>
        </FadeIn>

        {/* OAuth */}
        <FadeIn delay={0.1}>
          <OAuthButtons />
        </FadeIn>

        {/* Divider */}
        <FadeIn direction="none" delay={0.15} className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </FadeIn>

        {/* Form */}
        <FadeIn delay={0.2}>
          <Suspense>
            <LoginForm />
          </Suspense>
        </FadeIn>

      </div>

      {/* Sign-up nudge */}
      <FadeIn direction="none" delay={0.25}>
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up free
          </Link>
        </p>
      </FadeIn>

    </FadeIn>
  );
}
