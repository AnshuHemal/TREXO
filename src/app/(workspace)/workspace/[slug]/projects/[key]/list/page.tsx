import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { IssueListClient } from "./_components/issue-list-client";

interface IssueListPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function IssueListPage({ params }: IssueListPageProps) {
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

  // ── All issues with full relations ────────────────────────────────────────
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      sprint:   { select: { id: true, name: true, status: true } },
      parent:   { select: { id: true, title: true, type: true, key: true } },
      _count:   { select: { comments: true, subTasks: true } },
    },
  });

  // ── Epic map ──────────────────────────────────────────────────────────────
  const epicMap = new Map<string, { id: string; title: string; key: number }>();
  for (const issue of issues) {
    if (issue.parent?.type === "EPIC") {
      epicMap.set(issue.id, {
        id: issue.parent.id,
        title: issue.parent.title,
        key: issue.parent.key,
      });
    }
  }

  // ── Blocked issues ────────────────────────────────────────────────────────
  const issueIds = issues.map((i) => i.id);
  let blockedIds = new Set<string>();
  try {
    const links = await prisma.issueLink.findMany({
      where: {
        type: "BLOCKS",
        targetId: { in: issueIds },
        source: { status: { notIn: ["DONE", "CANCELLED"] } },
      },
      select: { targetId: true },
    });
    blockedIds = new Set(links.map((l) => l.targetId));
  } catch { /* stale client */ }

  // ── Members ───────────────────────────────────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  // ── Sprints ───────────────────────────────────────────────────────────────
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, status: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  // ── Epics ─────────────────────────────────────────────────────────────────
  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    select: { id: true, key: true, title: true },
    orderBy: { key: "asc" },
  });

  const issueList = issues.map((i) => ({
    id:           i.id,
    key:          i.key,
    title:        i.title,
    type:         i.type,
    status:       i.status,
    priority:     i.priority,
    estimate:     i.estimate,
    dueDate:      i.dueDate,
    assigneeId:   i.assigneeId,
    assignee:     i.assignee,
    reporter:     i.reporter,
    description:  i.description,
    createdAt:    i.createdAt,
    updatedAt:    i.updatedAt,
    sprintId:     i.sprintId,
    sprintName:   i.sprint?.name ?? null,
    commentCount: i._count.comments,
    subTaskCount: i._count.subTasks,
    epicId:       epicMap.get(i.id)?.id    ?? null,
    epicTitle:    epicMap.get(i.id)?.title ?? null,
    epicKey:      epicMap.get(i.id)?.key   ?? null,
    isBlocked:    blockedIds.has(i.id),
  }));

  return (
    <FadeIn className="flex flex-1 flex-col overflow-hidden">
      <IssueListClient
        project={project}
        issues={issueList}
        members={members.map((m) => ({
          id: m.user.id, name: m.user.name,
          email: m.user.email, image: m.user.image,
        }))}
        sprints={sprints}
        epics={epics}
        currentUserId={user.id}
        currentUserName={user.name}
        currentUserImage={user.image}
        workspaceSlug={workspace.slug}
        workspaceId={workspace.id}
      />
    </FadeIn>
  );
}
