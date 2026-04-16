import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceTopbar } from "../../_components/workspace-topbar";
import { ProjectTabs } from "./_components/project-tabs";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; key: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  // Verify workspace membership
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
    notFound();
  }

  const { workspace } = membership;

  // Fetch project by workspace + key
  const project = await prisma.project.findFirst({
    where: {
      workspaceId: workspace.id,
      key: key.toUpperCase(),
    },
    select: { id: true, name: true, key: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle={project.name}
      />
      <ProjectTabs slug={slug} projectKey={project.key} />
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
