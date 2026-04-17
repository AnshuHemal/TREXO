import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../../_components/workspace-topbar";
import { LabelsManager } from "./_components/labels-manager";

interface LabelsPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage({ params }: LabelsPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  // Fetch all labels (global for now — scoped to workspace in a future iteration)
  const labels = await prisma.label.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      color: true,
      _count: { select: { issues: true } },
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Labels"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Labels</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Labels help categorise and filter issues across your workspace.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="max-w-2xl">
          <LabelsManager
            labels={labels}
            workspaceId={workspace.id}
            canManage={canManage}
          />
        </FadeIn>
      </main>
    </div>
  );
}
