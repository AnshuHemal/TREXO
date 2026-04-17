import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { canManageProject } from "@/lib/project-access";
import { AccessManager } from "./_components/access-manager";

interface AccessPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export const metadata: Metadata = { title: "Project Access" };

export default async function ProjectAccessPage({ params }: AccessPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  const project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: key.toUpperCase() },
    select: {
      id: true,
      name: true,
      key: true,
      visibility: true,
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  const canManage = await canManageProject(user.id, project.id);

  // All workspace members (for the add-member dropdown)
  const wsMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const projectMemberList = project.members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role as "LEAD" | "MEMBER" | "VIEWER",
  }));

  const workspaceMemberList = wsMembers.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  return (
    <main className="flex-1 p-6">
      <FadeIn direction="down" className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Access Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage who can see and access{" "}
          <span className="font-medium text-foreground">{project.name}</span>.
        </p>
      </FadeIn>

      <FadeIn delay={0.05} className="max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6">
          <AccessManager
            projectId={project.id}
            initialVisibility={project.visibility as "PUBLIC" | "PRIVATE"}
            projectMembers={projectMemberList}
            workspaceMembers={workspaceMemberList}
            canManage={canManage}
          />
        </div>
      </FadeIn>
    </main>
  );
}
