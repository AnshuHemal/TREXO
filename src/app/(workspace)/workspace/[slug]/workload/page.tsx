import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerChildren } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { WorkloadClient } from "./_components/workload-client";
import type { WorkspaceRole } from "@/generated/prisma/enums";

interface WorkloadPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WorkloadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Workload — ${ws.name}` : "Workload" };
}

export default async function WorkloadPage({ params }: WorkloadPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const openIssues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: { not: null },
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    select: {
      id: true,
      key: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      estimate: true,
      assigneeId: true,
      project: { select: { key: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
    role: m.role as WorkspaceRole,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Workload"
      />
      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Workload</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See how work is distributed across your team.
          </p>
        </FadeIn>
        <WorkloadClient
          members={memberList}
          issues={openIssues}
          currentUserId={user.id}
          workspaceSlug={slug}
        />
      </main>
    </div>
  );
}
