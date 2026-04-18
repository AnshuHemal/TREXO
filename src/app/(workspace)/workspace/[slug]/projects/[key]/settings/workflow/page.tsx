import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkflowEditor } from "./_components/workflow-editor";
import { parseWorkflowConfig } from "@/lib/workflow";

interface WorkflowPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export const metadata: Metadata = { title: "Workflow Settings" };

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  // OWNER or ADMIN only
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  const project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: key.toUpperCase() },
    select: { id: true, name: true, key: true, workflowConfig: true },
  });

  if (!project) notFound();

  const workflowConfig = parseWorkflowConfig(project.workflowConfig);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <FadeIn direction="down" className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Workflow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize status labels, column order, and allowed transitions for{" "}
          <span className="font-medium text-foreground">{project.name}</span>.
        </p>
      </FadeIn>

      <WorkflowEditor
        projectId={project.id}
        projectKey={project.key}
        workspaceSlug={workspace.slug}
        initialConfig={workflowConfig}
      />
    </main>
  );
}
