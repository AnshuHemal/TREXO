import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { MyIssuesClient } from "./_components/my-issues-client";

interface MyIssuesPageProps {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: "My Issues",
};

export default async function MyIssuesPage({ params }: MyIssuesPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  // Fetch all issues assigned to the current user in this workspace
  const issues = await prisma.issue.findMany({
    where: {
      assigneeId: user.id,
      project: { workspaceId: workspace.id },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      project: { select: { id: true, name: true, key: true } },
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
  });

  // Workspace members for the issue detail modal
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

  const issueList = issues.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    type: i.type,
    status: i.status,
    priority: i.priority,
    assigneeId: i.assigneeId,
    assignee: i.assignee,
    reporter: i.reporter,
    description: i.description,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    commentCount: i._count.comments,
    project: i.project,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="My Issues"
      />

      <FadeIn className="flex flex-1 flex-col overflow-y-auto">
        <MyIssuesClient
          issues={issueList}
          members={memberList}
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserImage={user.image}
          workspaceSlug={workspace.slug}
        />
      </FadeIn>
    </div>
  );
}
