import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { TimeReportClient } from "./_components/time-report-client";

interface TimeReportPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: TimeReportPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Time Report — ${key.toUpperCase()}` };
}

export default async function TimeReportPage({ params }: TimeReportPageProps) {
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

  // All time logs for this project
  const timeLogs = await prisma.timeLog.findMany({
    where: { issue: { projectId: project.id } },
    orderBy: { loggedAt: "desc" },
    include: {
      user:  { select: { id: true, name: true, image: true } },
      issue: { select: { id: true, key: true, title: true, status: true, estimate: true } },
    },
  });

  // Workspace members for filter
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  const logList = timeLogs.map((l) => ({
    id:          l.id,
    minutes:     l.minutes,
    loggedAt:    l.loggedAt,
    description: l.description,
    user:        l.user,
    issue:       l.issue,
  }));

  const memberList = members.map((m) => ({
    id:    m.user.id,
    name:  m.user.name,
    image: m.user.image,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Time Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All time logged across issues in{" "}
            <span className="font-medium text-foreground">{project.name}</span>.
          </p>
        </FadeIn>

        <TimeReportClient
          logs={logList}
          members={memberList}
          projectKey={project.key}
        />
      </main>
    </div>
  );
}
