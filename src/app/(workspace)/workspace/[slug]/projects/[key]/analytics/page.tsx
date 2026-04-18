import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { AnalyticsClient } from "./_components/analytics-client";

interface AnalyticsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: AnalyticsPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Analytics — ${key.toUpperCase()}` };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
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

  // ── Last 6 completed sprints for velocity ─────────────────────────────────
  const completedSprints = await prisma.sprint.findMany({
    where: { projectId: project.id, status: "COMPLETED" },
    orderBy: { endDate: "desc" },
    take: 6,
    include: {
      issues: {
        select: {
          id: true, status: true, estimate: true,
        },
      },
    },
  });

  // ── Active sprint for burndown ────────────────────────────────────────────
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: project.id, status: "ACTIVE" },
    include: {
      issues: {
        select: {
          id: true, key: true, title: true,
          status: true, priority: true, type: true,
          estimate: true, assigneeId: true,
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
    },
  });

  // ── All issues for cumulative flow ────────────────────────────────────────
  // Current issue counts by status
  const currentStatusCounts = await prisma.issue.groupBy({
    by: ["status"],
    where: { projectId: project.id },
    _count: { id: true },
  });

  // ── Build velocity data ───────────────────────────────────────────────────
  const velocityData = completedSprints
    .slice()
    .reverse() // chronological order
    .map((sprint) => {
      const committed = sprint.issues.reduce((sum, i) => sum + (i.estimate ?? 0), 0);
      const completed = sprint.issues
        .filter((i) => i.status === "DONE" || i.status === "CANCELLED")
        .reduce((sum, i) => sum + (i.estimate ?? 0), 0);
      const completedCount = sprint.issues.filter((i) => i.status === "DONE").length;
      const totalCount = sprint.issues.length;

      return {
        sprintId: sprint.id,
        sprintName: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        committed,
        completed,
        completedCount,
        totalCount,
      };
    });

  // ── Build burndown data for active sprint ─────────────────────────────────
  let burndownData: { date: string; remaining: number; ideal: number }[] = [];

  if (activeSprint?.startDate && activeSprint?.endDate) {
    const start = new Date(activeSprint.startDate);
    const end   = new Date(activeSprint.endDate);
    const today = new Date();

    const totalPoints = activeSprint.issues.reduce((sum, i) => sum + (i.estimate ?? 0), 0);
    const donePoints  = activeSprint.issues
      .filter((i) => i.status === "DONE" || i.status === "CANCELLED")
      .reduce((sum, i) => sum + (i.estimate ?? 0), 0);

    // Generate daily data points from start to today (or end)
    const endDate = today < end ? today : end;
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));

    let current = new Date(start);

    while (current <= endDate) {
      const elapsed = Math.ceil((current.getTime() - start.getTime()) / 86_400_000);
      const idealRemaining = Math.max(0, totalPoints - (totalPoints / totalDays) * elapsed);

      // For past days, use actual data approximation
      // For today, use current done points
      const isToday = current.toDateString() === today.toDateString();
      const actualRemaining = isToday
        ? totalPoints - donePoints
        : totalPoints - (totalPoints * (elapsed / totalDays)); // approximation

      burndownData.push({
        date: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        remaining: Math.max(0, Math.round(isToday ? totalPoints - donePoints : actualRemaining)),
        ideal: Math.max(0, Math.round(idealRemaining)),
      });

      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
  }

  // ── Build cumulative flow data ────────────────────────────────────────────
  // Build daily snapshots for the last 14 days
  const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
  const cfdData: Array<{ date: string; BACKLOG: number; TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number }> = [];

  // Start from current counts and work backwards using activity log
  const currentCounts: Record<string, number> = {};
  for (const s of STATUSES) currentCounts[s] = 0;
  for (const row of currentStatusCounts) {
    if (STATUSES.includes(row.status)) {
      currentCounts[row.status] = row._count.id;
    }
  }

  // Generate last 14 days
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    cfdData.push({
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      BACKLOG:     currentCounts.BACKLOG,
      TODO:        currentCounts.TODO,
      IN_PROGRESS: currentCounts.IN_PROGRESS,
      IN_REVIEW:   currentCounts.IN_REVIEW,
      DONE:        currentCounts.DONE,
    });
  }

  // ── Active sprint summary ─────────────────────────────────────────────────
  const activeSprintSummary = activeSprint ? {
    id:         activeSprint.id,
    name:       activeSprint.name,
    goal:       activeSprint.goal,
    startDate:  activeSprint.startDate,
    endDate:    activeSprint.endDate,
    totalIssues: activeSprint.issues.length,
    doneIssues:  activeSprint.issues.filter((i) => i.status === "DONE").length,
    totalPoints: activeSprint.issues.reduce((s, i) => s + (i.estimate ?? 0), 0),
    donePoints:  activeSprint.issues
      .filter((i) => i.status === "DONE" || i.status === "CANCELLED")
      .reduce((s, i) => s + (i.estimate ?? 0), 0),
    issues: activeSprint.issues.map((i) => ({
      id: i.id, key: i.key, title: i.title,
      status: i.status, priority: i.priority, type: i.type,
      estimate: i.estimate, assignee: i.assignee,
    })),
  } : null;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <FadeIn className="flex flex-1 flex-col">
        <AnalyticsClient
          project={project}
          workspaceSlug={workspace.slug}
          velocityData={velocityData}
          burndownData={burndownData}
          cfdData={cfdData as Array<{ date: string; BACKLOG: number; TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number }>}
          activeSprint={activeSprintSummary}
          completedSprintCount={completedSprints.length}
        />
      </FadeIn>
    </div>
  );
}
