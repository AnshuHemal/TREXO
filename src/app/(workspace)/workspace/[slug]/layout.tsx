import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceSidebar } from "./_components/workspace-sidebar";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import type { WorkspaceRole } from "@/generated/prisma/enums";

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: {
      workspace: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
          projects: {
            select: { id: true, name: true, key: true, icon: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  const userWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspace: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Flatten members for search + topbar
  const memberList = workspace.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }));

  const projectList = workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    key: p.key,
  }));

  return (
    <WorkspaceProvider
      value={{
        workspaceId:   workspace.id,
        workspaceSlug: workspace.slug,
        workspaceName: workspace.name,
        projects:      projectList,
        members:       memberList,
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <WorkspaceSidebar
          workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug, logo: workspace.logo }}
          projects={workspace.projects}
          userWorkspaces={userWorkspaces.map((m) => m.workspace)}
          currentUserRole={membership.role as WorkspaceRole}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
