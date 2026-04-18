import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { SprintList } from "./_components/sprint-list";

interface SprintsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function SprintsPage({ params }: SprintsPageProps) {
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

  // Fetch all sprints with their issues
  const sprints = await prisma.sprint.findMany({
    where: { projectId: project.id },
    orderBy: [
      // Active first, then planned, then completed
      { status: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      issues: {
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  // Backlog issues (not assigned to any sprint)
  const backlogIssues = await prisma.issue.findMany({
    where: { projectId: project.id, sprintId: null },
    orderBy: { position: "asc" },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  const sprintList = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    goal: s.goal,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    issues: s.issues.map((i) => ({
      id: i.id,
      key: i.key,
      title: i.title,
      type: i.type,
      status: i.status,
      priority: i.priority,
      estimate: i.estimate,
      assignee: i.assignee,
    })),
  }));

  const backlogList = backlogIssues.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    type: i.type,
    status: i.status,
    priority: i.priority,
    assignee: i.assignee,
  }));

  return (
    <FadeIn className="flex flex-1 flex-col overflow-y-auto p-6">
      <SprintList
        project={project}
        sprints={sprintList}
        backlogIssues={backlogList}
        workspaceSlug={workspace.slug}
      />
    </FadeIn>
  );
}
