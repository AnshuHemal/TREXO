import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../../_components/workspace-topbar";
import { TemplatesManager } from "./_components/templates-manager";

interface TemplatesPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = { title: "Issue Templates" };

export default async function TemplatesPage({ params }: TemplatesPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;
  const canManage = membership.role === "OWNER" || membership.role === "ADMIN";

  const templates = await prisma.issueTemplate.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      priority: true,
      titlePrefix: true,
      createdAt: true,
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Issue Templates"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Issue Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Templates pre-fill the create issue form — great for bug reports, feature requests, and incident reports.
          </p>
        </FadeIn>

        <FadeIn delay={0.05} className="max-w-2xl">
          <TemplatesManager
            workspaceId={workspace.id}
            initialTemplates={templates}
            canManage={canManage}
          />
        </FadeIn>
      </main>
    </div>
  );
}
