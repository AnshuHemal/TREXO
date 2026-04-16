import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Workspace layout — session + membership guard.
 *
 * Ensures the user is authenticated and has at least one workspace.
 * Individual workspace pages validate membership for the specific slug.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { id: true },
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
