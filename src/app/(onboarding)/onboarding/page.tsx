import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
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
  const user = await requireUser();

  // Check if the user already belongs to a workspace.
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    include: { workspace: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (existingMembership) {
    redirect(`/workspace/${existingMembership.workspace.slug}`);
  }

  return <OnboardingWizard />;
}
