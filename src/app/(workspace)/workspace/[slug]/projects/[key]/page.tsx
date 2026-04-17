import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "./_components/kanban-board";

interface ProjectBoardPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function ProjectBoardPage({ params }: ProjectBoardPageProps) {
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
    select: { id: true, name: true, key: true },
  });

  if (!project) notFound();

  // Fetch all issues ordered by position within each status
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    orderBy: { position: "asc" },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
      parent: { select: { id: true, title: true, type: true } },
    },
  });

  // Build epic lookup from parent issues of type EPIC
  const epicMap = new Map<string, { id: string; title: string }>();
  for (const issue of issues) {
    if (issue.parent && issue.parent.type === "EPIC") {
      epicMap.set(issue.id, { id: issue.parent.id, title: issue.parent.title });
    }
  }

  // Find which issues are blocked (have an incoming BLOCKS link from an unresolved issue)
  const issueIds = issues.map((i) => i.id);
  const blockingLinks = await prisma.issueLink.findMany({
    where: {
      type: "BLOCKS",
      targetId: { in: issueIds },
      // Only count as blocked if the blocking issue is not done/cancelled
      source: { status: { notIn: ["DONE", "CANCELLED"] } },
    },
    select: { targetId: true },
  });
  const blockedIds = new Set(blockingLinks.map((l) => l.targetId));

  // Workspace members for assignee picker in quick-create
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
    position: i.position,
    assigneeId: i.assigneeId,
    assignee: i.assignee,
    commentCount: i._count.comments,
    dueDate: i.dueDate,
    epicId: epicMap.get(i.id)?.id ?? null,
    epicTitle: epicMap.get(i.id)?.title ?? null,
    isBlocked: blockedIds.has(i.id),
  }));

  return (
    <KanbanBoard
      project={project}
      issues={issueList}
      members={memberList}
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserImage={user.image}
      workspaceSlug={workspace.slug}
    />
  );
}
