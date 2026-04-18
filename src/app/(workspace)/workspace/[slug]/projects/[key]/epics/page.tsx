import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { EpicsClient } from "./_components/epics-client";

interface EpicsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: EpicsPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Epics — ${key.toUpperCase()}` };
}

export default async function EpicsPage({ params }: EpicsPageProps) {
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

  // Fetch all epics (without subTasks — we fetch children separately below)
  const epics = await prisma.issue.findMany({
    where: { projectId: project.id, type: "EPIC" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
  });

  // Also fetch issues that have this epic as their parent (non-subtask children)
  const epicIds = epics.map((e) => e.id);
  const childIssues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      parentId: { in: epicIds },
      type: { not: "SUBTASK" },
    },
    select: {
      id: true, key: true, title: true,
      type: true, status: true, priority: true,
      parentId: true, assigneeId: true,
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { key: "asc" },
  });

  // Group child issues by epic
  const childByEpic = new Map<string, typeof childIssues>();
  for (const child of childIssues) {
    if (!child.parentId) continue;
    if (!childByEpic.has(child.parentId)) childByEpic.set(child.parentId, []);
    childByEpic.get(child.parentId)!.push(child);
  }

  // Workspace members for assignee display
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

  const epicList = epics.map((e) => {
    const children = childByEpic.get(e.id) ?? [];
    const totalChildren = children.length;
    const doneChildren  = children.filter(
      (c) => c.status === "DONE" || c.status === "CANCELLED",
    ).length;

    return {
      id:          e.id,
      key:         e.key,
      title:       e.title,
      description: e.description,
      status:      e.status,
      priority:    e.priority,
      dueDate:     e.dueDate,
      estimate:    e.estimate,
      createdAt:   e.createdAt,
      updatedAt:   e.updatedAt,
      assigneeId:  e.assigneeId,
      assignee:    e.assignee,
      reporter:    e.reporter,
      commentCount: e._count.comments,
      totalChildren,
      doneChildren,
      children: children.map((c) => ({
        id:         c.id,
        key:        c.key,
        title:      c.title,
        type:       c.type,
        status:     c.status,
        priority:   c.priority,
        assigneeId: c.assigneeId,
        assignee:   c.assignee,
      })),
    };
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <FadeIn className="flex flex-1 flex-col">
        <EpicsClient
          project={project}
          epics={epicList}
          members={memberList}
          workspaceSlug={workspace.slug}
        />
      </FadeIn>
    </div>
  );
}
