import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { HealthClient } from "./_components/health-client";

interface HealthPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: HealthPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Health — ${key.toUpperCase()}` };
}

export default async function HealthPage({ params }: HealthPageProps) {
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
    select: { id: true, name: true, key: true, createdAt: true },
  });
  if (!project) notFound();

  const statusCounts = await prisma.issue.groupBy({
    by: ["status"],
    where: { projectId: project.id },
    _count: { id: true },
  });

  const priorityCounts = await prisma.issue.groupBy({
    by: ["priority"],
    where: { projectId: project.id, status: { notIn: ["DONE", "CANCELLED"] } },
    _count: { id: true },
  });

  const typeCounts = await prisma.issue.groupBy({
    by: ["type"],
    where: { projectId: project.id },
    _count: { id: true },
  });

  const doneActivities = await prisma.activity.findMany({
    where: {
      issue: { projectId: project.id },
      type: "status_changed",
      toValue: "DONE",
    },
    select: {
      createdAt: true,
      issue: { select: { id: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const seenIssues = new Set<string>();
  const cycleTimes: number[] = [];
  for (const act of doneActivities) {
    if (!act.issue || seenIssues.has(act.issue.id)) continue;
    seenIssues.add(act.issue.id);
    const days =
      (new Date(act.createdAt).getTime() - new Date(act.issue.createdAt).getTime()) /
      86_400_000;
    if (days >= 0) cycleTimes.push(days);
  }
  const avgCycleTime =
    cycleTimes.length > 0
      ? Math.round((cycleTimes.reduce((s, d) => s + d, 0) / cycleTimes.length) * 10) / 10
      : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const recentIssues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true, status: true },
    orderBy: { createdAt: "asc" },
  });

  const recentClosedActivities = await prisma.activity.findMany({
    where: {
      issue: { projectId: project.id },
      type: "status_changed",
      toValue: "DONE",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const trendMap = new Map<
    string,
    { date: string; opened: number; closed: number }
  >();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    trendMap.set(label, { date: label, opened: 0, closed: 0 });
  }
  for (const issue of recentIssues) {
    const label = new Date(issue.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const entry = trendMap.get(label);
    if (entry) entry.opened++;
  }
  for (const act of recentClosedActivities) {
    const label = new Date(act.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const entry = trendMap.get(label);
    if (entry) entry.closed++;
  }
  const trendData = Array.from(trendMap.values());

  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: project.id, status: "ACTIVE" },
    select: { id: true, name: true },
  });

  const closedIssues = await prisma.issue.findMany({
    where: {
      projectId: project.id,
      status: { in: ["DONE", "CANCELLED"] },
      assigneeId: { not: null },
      ...(activeSprint ? { sprintId: activeSprint.id } : {}),
    },
    select: {
      assigneeId: true,
      assignee: { select: { id: true, name: true, image: true } },
      estimate: true,
    },
  });

  const contributorMap = new Map<
    string,
    { user: { id: string; name: string; image: string | null }; count: number; points: number }
  >();
  for (const issue of closedIssues) {
    if (!issue.assigneeId || !issue.assignee) continue;
    const existing = contributorMap.get(issue.assigneeId);
    if (existing) {
      existing.count++;
      existing.points += issue.estimate ?? 0;
    } else {
      contributorMap.set(issue.assigneeId, {
        user: issue.assignee,
        count: 1,
        points: issue.estimate ?? 0,
      });
    }
  }
  const topContributors = Array.from(contributorMap.values())
    .sort((a, b) => b.count - a.count || b.points - a.points)
    .slice(0, 8);

  const totalIssues = statusCounts.reduce((s, r) => s + r._count.id, 0);
  const openIssues = statusCounts
    .filter((r) => !["DONE", "CANCELLED"].includes(r.status))
    .reduce((s, r) => s + r._count.id, 0);
  const doneIssues = statusCounts
    .filter((r) => r.status === "DONE")
    .reduce((s, r) => s + r._count.id, 0);
  const overdueCount = await prisma.issue.count({
    where: {
      projectId: project.id,
      status: { notIn: ["DONE", "CANCELLED"] },
      dueDate: { lt: new Date() },
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <FadeIn className="flex flex-1 flex-col">
        <HealthClient
          project={{ id: project.id, name: project.name, key: project.key }}
          workspaceSlug={workspace.slug}

          statusCounts={statusCounts.map((r) => ({ status: r.status, count: r._count.id }))}

          priorityCounts={priorityCounts.map((r) => ({ priority: r.priority, count: r._count.id }))}

          typeCounts={typeCounts.map((r) => ({ type: r.type, count: r._count.id }))}

          trendData={trendData}

          avgCycleTime={avgCycleTime}
          cycleTimeSampleSize={cycleTimes.length}

          topContributors={topContributors}
          activeSprintName={activeSprint?.name ?? null}

          totalIssues={totalIssues}
          openIssues={openIssues}
          doneIssues={doneIssues}
          overdueCount={overdueCount}
        />
      </FadeIn>
    </div>
  );
}
