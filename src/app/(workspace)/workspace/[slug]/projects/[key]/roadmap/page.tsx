import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { RoadmapClient } from "./_components/roadmap-client";

interface RoadmapPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
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

  // ── Sprints ───────────────────────────────────────────────────────────────────
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { issues: true } },
      issues: { select: { id: true, status: true } },
    },
  });

  // ── Epics ─────────────────────────────────────────────────────────────────────
  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, key: true, title: true, status: true, priority: true,
      dueDate: true, createdAt: true,
      _count: { select: { subTasks: true } },
      subTasks: { select: { id: true, status: true } },
    },
  });

  // ── Issues with due dates (for issue-level timeline) ──────────────────────────
  const issues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      type: { notIn: ["EPIC", "SUBTASK"] },
      dueDate: { not: null },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, key: true, title: true, type: true,
      status: true, priority: true,
      dueDate: true, createdAt: true,
      sprintId: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  // ── Workspace members (for group-by assignee) ─────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const sprintList = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    status: s.status as "PLANNED" | "ACTIVE" | "COMPLETED",
    startDate: s.startDate,
    endDate: s.endDate,
    issueCount: s._count.issues,
    doneCount: s.issues.filter((i) => i.status === "DONE" || i.status === "CANCELLED").length,
  }));

  const epicList = epics.map((e) => ({
    id: e.id,
    key: e.key,
    title: e.title,
    status: e.status as string,
    priority: e.priority as string,
    dueDate: e.dueDate,
    createdAt: e.createdAt,
    subTaskCount: e._count.subTasks,
    doneSubTaskCount: e.subTasks.filter((s) => s.status === "DONE" || s.status === "CANCELLED").length,
  }));

  const issueList = issues.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    type: i.type as string,
    status: i.status as string,
    priority: i.priority as string,
    dueDate: i.dueDate,
    createdAt: i.createdAt,
    sprintId: i.sprintId,
    assigneeId: i.assigneeId,
    assignee: i.assignee,
  }));

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
  }));

  return (
    <RoadmapClient
      project={project}
      sprints={sprintList}
      epics={epicList}
      issues={issueList}
      members={memberList}
      workspaceSlug={workspace.slug}
    />
  );
}
