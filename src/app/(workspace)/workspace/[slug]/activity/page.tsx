import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { ActivityFeedFull } from "./_components/activity-feed-full";

interface ActivityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug }, select: { name: true } });
  return { title: ws ? `Activity — ${ws.name}` : "Activity" };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;

  // Last 100 activities across all projects in this workspace
  const activities = await prisma.activity.findMany({
    where: { issue: { project: { workspaceId: workspace.id } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { id: true, name: true, image: true } },
      issue: {
        select: {
          id: true,
          key: true,
          title: true,
          project: { select: { key: true, name: true } },
        },
      },
    },
  });

  const activityList = activities.map((a) => ({
    id: a.id,
    type: a.type,
    fromValue: a.fromValue,
    toValue: a.toValue,
    createdAt: a.createdAt,
    actor: a.actor,
    issue: a.issue,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Activity"
      />
      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything that happened across your workspace, most recent first.
          </p>
        </FadeIn>
        <FadeIn delay={0.05} className="max-w-2xl">
          <ActivityFeedFull activities={activityList} workspaceSlug={slug} />
        </FadeIn>
      </main>
    </div>
  );
}
