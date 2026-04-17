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

  // Fetch sprints with their issue counts
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { issues: true } },
      issues: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  // Fetch epics for this project
  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      key: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      _count: { select: { subTasks: true } },
      subTasks: { select: { id: true, status: true } },
    },
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

  return (
    <RoadmapClient
      project={project}
      sprints={sprintList}
      epics={epicList}
    />
  );
}
