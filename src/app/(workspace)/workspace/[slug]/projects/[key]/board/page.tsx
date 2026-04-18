import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SprintBoardClient } from "./_components/sprint-board-client";
import { NoActiveSprint } from "./_components/no-active-sprint";

interface SprintBoardPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function SprintBoardPage({ params }: SprintBoardPageProps) {
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

  // ── Active sprint ─────────────────────────────────────────────────────────────
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: project.id, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      goal: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  // ── Planned sprints (for "no active sprint" state) ────────────────────────────
  const plannedSprints = await prisma.sprint.findMany({
    where: { projectId: project.id, status: "PLANNED" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  // If no active sprint, show the empty state
  if (!activeSprint) {
    return (
      <NoActiveSprint
        project={project}
        workspaceSlug={workspace.slug}
        plannedSprints={plannedSprints}
      />
    );
  }

  // ── Issues in the active sprint ───────────────────────────────────────────────
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id, sprintId: activeSprint.id },
    orderBy: { position: "asc" },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
      parent: { select: { id: true, title: true, type: true } },
    },
  });

  // ── Epic lookup ───────────────────────────────────────────────────────────────
  const epicMap = new Map<string, { id: string; title: string }>();
  for (const issue of issues) {
    if (issue.parent && issue.parent.type === "EPIC") {
      epicMap.set(issue.id, { id: issue.parent.id, title: issue.parent.title });
    }
  }

  // ── Blocked issues ────────────────────────────────────────────────────────────
  const issueIds = issues.map((i) => i.id);
  let blockedIds = new Set<string>();
  try {
    const blockingLinks = await prisma.issueLink.findMany({
      where: {
        type: "BLOCKS",
        targetId: { in: issueIds },
        source: { status: { notIn: ["DONE", "CANCELLED"] } },
      },
      select: { targetId: true },
    });
    blockedIds = new Set(blockingLinks.map((l) => l.targetId));
  } catch {
    // stale client — ignore
  }

  // ── Workspace members ─────────────────────────────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  // ── Other planned sprints (for complete sprint dialog) ────────────────────────
  const otherSprints = await prisma.sprint.findMany({
    where: { projectId: project.id, status: "PLANNED" },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  // ── Epics for filter panel ────────────────────────────────────────────────────
  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    select: { id: true, key: true, title: true },
    orderBy: { key: "asc" },
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

  // Sprint stats
  const totalIssues = issueList.length;
  const doneIssues  = issueList.filter((i) => i.status === "DONE" || i.status === "CANCELLED").length;

  return (
    <SprintBoardClient
      project={project}
      sprint={{
        ...activeSprint,
        totalIssues,
        doneIssues,
      }}
      issues={issueList}
      members={memberList}
      epics={epics}
      otherSprints={otherSprints}
      currentUserId={user.id}
      currentUserName={user.name}
      currentUserImage={user.image}
      workspaceSlug={workspace.slug}
    />
  );
}
