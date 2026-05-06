import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { siteConfig } from "@/config/site";
import { OnboardingWizard } from "./_components/onboarding-wizard";

export const metadata: Metadata = {
  title: "Welcome to Trexo",
  description: `Set up your ${siteConfig.name} workspace to get started.`,
};

/**
 * Onboarding page — /onboarding
 *
 * Server-side guard:
 *   1. Must be authenticated (requireUser redirects to /login if not)
 *   2. If the user already has a workspace, skip onboarding entirely
 *      and redirect to their first workspace.
 */
export default async function OnboardingPage() {
  await requireUser();

  return <OnboardingWizard />;
}
