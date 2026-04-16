import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Dashboard layout — server-side session + onboarding guard.
 *
 * Two checks:
 *   1. Must be authenticated (requireUser redirects to /login if not)
 *   2. Must have at least one workspace — if not, redirect to /onboarding
 *      so the user completes setup before accessing the dashboard.
 *
 * proxy.ts handles the optimistic cookie-based redirect, but this layout
 * performs the real server-side validation.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Check workspace membership — redirect to onboarding if none exists.
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspace: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
