import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, FolderKanban, ArrowRight, Hash } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "./_components/workspace-topbar";
import { ProjectGrid } from "./_components/project-grid";
import { CreateProjectDialog } from "./projects/_components/create-project-dialog";
import { ActiveSprintWidget } from "./_components/dashboard/active-sprint-widget";
import { MyIssuesWidget } from "./_components/dashboard/my-issues-widget";
import { ActivityFeed } from "./_components/dashboard/activity-feed";
import { StatusChart } from "./_components/dashboard/status-chart";
import { RecentIssuesWidget } from "./_components/dashboard/recent-issues-widget";

interface WorkspacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `${workspace.name} — Home` : "Workspace" };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: {
      workspace: {
        include: { _count: { select: { members: true, projects: true } } },
      },
    },
  });

  if (!membership) notFound();

  const { workspace } = membership;
  const canCreate = membership.role === "OWNER" || membership.role === "ADMIN";

  // ── Parallel data fetching ─────────────────────────────────────────────────

  const [
    recentProjects,
    activeSprint,
    myOpenIssues,
    recentActivity,
    statusCounts,
    recentlyUpdated,
    totalIssues,
  ] = await Promise.all([

    // Recent projects (up to 6)
    prisma.project.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, key: true, description: true, _count: { select: { issues: true } } },
    }),

    // Active sprint (first one found across all projects)
    prisma.sprint.findFirst({
      where: {
        status: "ACTIVE",
        project: { workspaceId: workspace.id },
      },
      include: {
        project: { select: { name: true, key: true } },
        _count: { select: { issues: true } },
        issues: { select: { status: true } },
      },
      orderBy: { startDate: "desc" },
    }),

    // My open issues (top 5)
    prisma.issue.findMany({
      where: {
        assigneeId: user.id,
        project: { workspaceId: workspace.id },
        status: { notIn: ["DONE", "CANCELLED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        project: { select: { key: true } },
      },
    }),

    // Recent activity (last 10 across all projects)
    prisma.activity.findMany({
      where: {
        issue: { project: { workspaceId: workspace.id } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { id: true, name: true, image: true } },
        issue: {
          select: {
            id: true,
            key: true,
            title: true,
            project: { select: { key: true } },
          },
        },
      },
    }),

    // Issue status breakdown (grouped)
    prisma.issue.groupBy({
      by: ["status"],
      where: { project: { workspaceId: workspace.id } },
      _count: { status: true },
    }),

    // Recently updated issues (last 5)
    prisma.issue.findMany({
      where: { project: { workspaceId: workspace.id } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        updatedAt: true,
        project: { select: { key: true, name: true } },
      },
    }),

    // Total issue count for the donut chart centre
    prisma.issue.count({
      where: { project: { workspaceId: workspace.id } },
    }),
  ]);

  // ── Shape data for widgets ─────────────────────────────────────────────────

  const activeSprintData = activeSprint
    ? {
        id: activeSprint.id,
        name: activeSprint.name,
        goal: activeSprint.goal,
        startDate: activeSprint.startDate,
        endDate: activeSprint.endDate,
        projectName: activeSprint.project.name,
        projectKey: activeSprint.project.key,
        workspaceSlug: slug,
        issueCounts: {
          total: activeSprint.issues.length,
          done: activeSprint.issues.filter((i) => i.status === "DONE" || i.status === "CANCELLED").length,
        },
      }
    : null;

  const myIssuesList = myOpenIssues.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    status: i.status,
    priority: i.priority,
    projectKey: i.project.key,
    workspaceSlug: slug,
  }));

  const activityList = recentActivity.map((a) => ({
    id: a.id,
    type: a.type,
    fromValue: a.fromValue,
    toValue: a.toValue,
    createdAt: a.createdAt,
    actor: a.actor,
    issue: a.issue,
  }));

  const statusData = statusCounts.map((s) => ({
    status: s.status,
    count: s._count.status,
  }));

  const recentIssuesList = recentlyUpdated.map((i) => ({
    id: i.id,
    key: i.key,
    title: i.title,
    status: i.status,
    priority: i.priority,
    updatedAt: i.updatedAt,
    projectKey: i.project.key,
    projectName: i.project.name,
    workspaceSlug: slug,
  }));

  const stats = [
    { label: "Members",  value: workspace._count.members,  icon: Users,        description: "People in this workspace" },
    { label: "Projects", value: workspace._count.projects, icon: FolderKanban, description: "Active projects" },
    { label: "Issues",   value: totalIssues,               icon: Hash,         description: "Total across all projects" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Home"
      />

      <main className="flex-1 p-6">
        {/* Welcome */}
        <FadeIn direction="down" className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in{" "}
            <span className="font-medium text-foreground">{workspace.name}</span>.
          </p>
        </FadeIn>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <FadeIn delay={0.05}>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, icon: Icon, description }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                </div>
                <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* ── Main dashboard grid ──────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">

          {/* Left column — 2/3 width */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            <ActiveSprintWidget sprint={activeSprintData} />
            <MyIssuesWidget issues={myIssuesList} workspaceSlug={slug} />
            <RecentIssuesWidget issues={recentIssuesList} />
          </div>

          {/* Right column — 1/3 width */}
          <div className="flex flex-col gap-5">
            <StatusChart data={statusData} totalIssues={totalIssues} />
            <ActivityFeed activities={activityList} />
          </div>

        </div>

        {/* ── Recent projects ──────────────────────────────────────────────── */}
        <FadeIn delay={0.4} className="mt-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Recent Projects</h2>
            <div className="flex items-center gap-2">
              {canCreate && (
                <CreateProjectDialog workspaceId={workspace.id} workspaceSlug={workspace.slug} />
              )}
              <Link
                href={`/workspace/${slug}/projects`}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <ProjectGrid
            projects={recentProjects}
            workspaceId={workspace.id}
            workspaceSlug={workspace.slug}
            canCreate={canCreate}
          />
        </FadeIn>
      </main>
    </div>
  );
}
