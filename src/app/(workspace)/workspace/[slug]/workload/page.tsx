import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { WorkloadClient } from "./_components/workload-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkloadPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; project?: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: WorkloadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `Workload — ${workspace.name}` : "Workload" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WorkloadPage({ params, searchParams }: WorkloadPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!membership) notFound();

  const { workspace } = membership;

  // ── All workspace members ─────────────────────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── All projects (for filter) ─────────────────────────────────────────────
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });

  // ── Active project filter ─────────────────────────────────────────────────
  const projectFilter = sp.project
    ? projects.find((p) => p.id === sp.project)
    : null;

  // ── Fetch all non-done issues with assignees ──────────────────────────────
  // We look at issues that are not DONE/CANCELLED and have an assignee
  const issues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: { not: null },
      status: { notIn: ["DONE", "CANCELLED"] },
      ...(projectFilter ? { projectId: projectFilter.id } : {}),
    },
    select: {
      id: true,
      key: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      estimate: true,
      dueDate: true,
      assigneeId: true,
      project: { select: { id: true, key: true, name: true } },
      sprint: { select: { id: true, name: true, endDate: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── Build per-member workload data ────────────────────────────────────────
  const memberData = members.map((m) => {
    const memberIssues = issues.filter((i) => i.assigneeId === m.user.id);
    const totalIssues = memberIssues.length;
    const totalPoints = memberIssues.reduce((s, i) => s + (i.estimate ?? 0), 0);

    // Group by project
    const byProject: Record<string, { projectKey: string; projectName: string; count: number; points: number }> = {};
    for (const issue of memberIssues) {
      const key = issue.project.id;
      if (!byProject[key]) {
        byProject[key] = {
          projectKey: issue.project.key,
          projectName: issue.project.name,
          count: 0,
          points: 0,
        };
      }
      byProject[key].count++;
      byProject[key].points += issue.estimate ?? 0;
    }

    // Group by status
    const byStatus: Record<string, number> = {};
    for (const issue of memberIssues) {
      byStatus[issue.status] = (byStatus[issue.status] ?? 0) + 1;
    }

    // Overdue issues (dueDate in the past)
    const now = new Date();
    const overdueCount = memberIssues.filter(
      (i) => i.dueDate && new Date(i.dueDate) < now,
    ).length;

    return {
      user: {
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        email: m.user.email,
      },
      role: m.role,
      totalIssues,
      totalPoints,
      overdueCount,
      byProject: Object.values(byProject),
      byStatus,
      issues: memberIssues.map((i) => ({
        id: i.id,
        key: i.key,
        title: i.title,
        status: i.status,
        priority: i.priority,
        type: i.type,
        estimate: i.estimate,
        dueDate: i.dueDate,
        projectKey: i.project.key,
        projectName: i.project.name,
        sprintName: i.sprint?.name ?? null,
        sprintEndDate: i.sprint?.endDate ?? null,
      })),
    };
  });

  // ── Workspace-level stats ─────────────────────────────────────────────────
  const totalAssigned = issues.length;
  const totalPoints = issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
  const unassignedCount = await prisma.issue.count({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: null,
      status: { notIn: ["DONE", "CANCELLED"] },
      ...(projectFilter ? { projectId: projectFilter.id } : {}),
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Workload"
      />

      <div className="flex flex-1 flex-col overflow-y-auto">
        <main className="flex-1 p-6">
          <FadeIn direction="down" className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  Team Workload
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  See how work is distributed across your team. Identify overloaded members before assigning more.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {totalAssigned} active {totalAssigned === 1 ? "issue" : "issues"}
                </span>
              </div>
            </div>
          </FadeIn>

          <WorkloadClient
            members={memberData}
            projects={projects}
            workspaceSlug={workspace.slug}
            totalAssigned={totalAssigned}
            totalPoints={totalPoints}
            unassignedCount={unassignedCount}
            activeProjectId={sp.project ?? null}
          />
        </main>
      </div>
    </div>
  );
}
