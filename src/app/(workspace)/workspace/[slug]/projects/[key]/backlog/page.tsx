import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { BacklogClient } from "./_components/backlog-client";
import type { FilterState } from "./saved-filter-actions";

interface BacklogPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function BacklogPage({ params }: BacklogPageProps) {
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

  // Fetch all issues with relations
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
  });

  // Fetch workspace members for assignee picker
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Fetch saved filters for this project (personal + shared)
  const savedFilters = await prisma.savedFilter.findMany({
    where: {
      projectId: project.id,
      OR: [{ userId: user.id }, { isShared: true }],
    },
    orderBy: [{ isShared: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      filters: true,
      isShared: true,
      userId: true,
      createdAt: true,
    },
  });

  // Fetch active + planned sprints for sprint planning
  const sprints = await prisma.sprint.findMany({
    where: {
      projectId: project.id,
      status: { in: ["ACTIVE", "PLANNED"] },
    },
    select: { id: true, name: true, status: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
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
    dueDate: i.dueDate,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    commentCount: i._count.comments,
    sprintId: i.sprintId,
  }));

  const savedFilterList = savedFilters.map((f) => ({
    id: f.id,
    name: f.name,
    filters: f.filters as FilterState,
    isShared: f.isShared,
    userId: f.userId,
    createdAt: f.createdAt,
  }));

  return (
    <FadeIn className="flex flex-1 flex-col">
      <BacklogClient
        project={project}
        issues={issueList}
        members={memberList}
        currentUserId={user.id}
        currentUserName={user.name}
        currentUserImage={user.image}
        workspaceSlug={workspace.slug}
        workspaceId={workspace.id}
        savedFilters={savedFilterList}
        sprints={sprints}
      />
    </FadeIn>
  );
}
