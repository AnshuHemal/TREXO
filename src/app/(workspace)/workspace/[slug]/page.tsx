import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace?.name ?? "Workspace" };
}

/**
 * Workspace home — /workspace/[slug]
 *
 * Validates:
 *   1. User is authenticated
 *   2. Workspace exists
 *   3. User is a member of this workspace
 *
 * Placeholder until the full workspace shell is built.
 */
export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    // Workspace doesn't exist or user isn't a member.
    notFound();
  }

  const { workspace } = membership;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        {workspace.name}
      </h1>
      <p className="text-muted-foreground">
        Workspace shell is under construction. Projects and issues coming soon.
      </p>
    </div>
  );
}
