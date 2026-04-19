import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { SprintPlanningClient } from "./_components/sprint-planning-client";

interface PlanningPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: PlanningPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Sprint Planning — ${key.toUpperCase()}` };
}

export default async function SprintPlanningPage({ params }: PlanningPageProps) {
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

  // ── Backlog issues (not in any sprint) ────────────────────────────────────
  const backlogIssues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      sprintId: null,
      status: { notIn: ["DONE", "CANCELLED"] },
      type: { not: "SUBTASK" },
    },
    orderBy: [{ priority: "asc" }, { position: "asc" }],
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      parent:   { select: { id: true, title: true, type: true } },
    },
  });

  // ── Active + planned sprints ───────────────────────────────────────────────
  const sprints = await prisma.sprint.findMany({
    where: {
      projectId: project.id,
      status: { in: ["ACTIVE", "PLANNED"] },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    include: {
      issues: {
        where: { type: { not: "SUBTASK" } },
        orderBy: { position: "asc" },
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          parent:   { select: { id: true, title: true, type: true } },
        },
      },
    },
  });

  // ── Workspace members (for capacity) ──────────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const backlogList = backlogIssues.map((i) => ({
    id: i.id, key: i.key, title: i.title,
    type: i.type, status: i.status, priority: i.priority,
    estimate: i.estimate,
    assigneeId: i.assigneeId,
    assignee: i.assignee,
    epicTitle: i.parent?.type === "EPIC" ? i.parent.title : null,
  }));

  const sprintList = sprints.map((s) => ({
    id: s.id, name: s.name, goal: s.goal,
    status: s.status, startDate: s.startDate, endDate: s.endDate,
    issues: s.issues.map((i) => ({
      id: i.id, key: i.key, title: i.title,
      type: i.type, status: i.status, priority: i.priority,
      estimate: i.estimate,
      assigneeId: i.assigneeId,
      assignee: i.assignee,
      epicTitle: i.parent?.type === "EPIC" ? i.parent.title : null,
    })),
  }));

  const memberList = members.map((m) => ({
    id: m.user.id, name: m.user.name, image: m.user.image,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <FadeIn className="flex flex-1 flex-col overflow-hidden">
        <SprintPlanningClient
          project={project}
          workspaceSlug={workspace.slug}
          backlogIssues={backlogList}
          sprints={sprintList}
          members={memberList}
        />
      </FadeIn>
    </div>
  );
}
