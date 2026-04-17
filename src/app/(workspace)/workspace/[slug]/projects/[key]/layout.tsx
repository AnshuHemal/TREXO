import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceTopbar } from "../../_components/workspace-topbar";
import { ProjectTabs } from "./_components/project-tabs";
import { ProjectLayoutClient } from "./_components/project-layout-client";

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

  // Fetch workspace members for the create issue dialog
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle={project.name}
      />
      <ProjectTabs slug={slug} projectKey={project.key} />
      <ProjectLayoutClient
        workspaceSlug={workspace.slug}
        projectId={project.id}
        projectKey={project.key}
        members={memberList}
      >
        <div className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </div>
      </ProjectLayoutClient>
    </div>
  );
}
