import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { SprintReportClient } from "./_components/sprint-report-client";

interface SprintReportPageProps {
  params: Promise<{ slug: string; key: string; sprintId: string }>;
}

export async function generateMetadata({ params }: SprintReportPageProps): Promise<Metadata> {
  const { sprintId } = await params;
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { name: true },
  });
  return { title: sprint ? `${sprint.name} — Sprint Report` : "Sprint Report" };
}

export default async function SprintReportPage({ params }: SprintReportPageProps) {
  const { slug, key, sprintId } = await params;
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

  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId: project.id },
    include: {
      issues: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: { key: "asc" },
      },
    },
  });

  if (!sprint) notFound();

  // Categorize issues
  const completedIssues = sprint.issues.filter(
    (i) => i.status === "DONE" || i.status === "CANCELLED",
  );
  const carriedOverIssues = sprint.issues.filter(
    (i) => i.status !== "DONE" && i.status !== "CANCELLED",
  );

  const totalPoints    = sprint.issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
  const completedPoints = completedIssues.reduce((s, i) => s + (i.estimate ?? 0), 0);

  const reportData = {
    id:        sprint.id,
    name:      sprint.name,
    goal:      sprint.goal,
    status:    sprint.status,
    startDate: sprint.startDate,
    endDate:   sprint.endDate,
    totalIssues:     sprint.issues.length,
    completedIssues: completedIssues.length,
    carriedOver:     carriedOverIssues.length,
    totalPoints,
    completedPoints,
    completed: completedIssues.map((i) => ({
      id: i.id, key: i.key, title: i.title,
      type: i.type, status: i.status, priority: i.priority,
      estimate: i.estimate, assignee: i.assignee,
    })),
    carriedOverList: carriedOverIssues.map((i) => ({
      id: i.id, key: i.key, title: i.title,
      type: i.type, status: i.status, priority: i.priority,
      estimate: i.estimate, assignee: i.assignee,
    })),
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <FadeIn className="flex flex-1 flex-col">
        <SprintReportClient
          project={project}
          workspaceSlug={workspace.slug}
          report={reportData}
        />
      </FadeIn>
    </div>
  );
}
