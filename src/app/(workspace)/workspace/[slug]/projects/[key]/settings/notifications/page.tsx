import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { ProjectNotificationsForm } from "./_components/project-notifications-form";

interface ProjectNotificationsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({
  params,
}: ProjectNotificationsPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Notifications — ${key.toUpperCase()}` };
}

export default async function ProjectNotificationsPage({
  params,
}: ProjectNotificationsPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  // Any workspace member can access their own notification settings
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

  // Check if the user has muted this project
  const mute = await prisma.projectNotificationMute.findUnique({
    where: { userId_projectId: { userId: user.id, projectId: project.id } },
    select: { id: true },
  });

  // Also fetch workspace-level prefs for context
  const workspacePrefs = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
    select: { assigned: true, mentioned: true, statusChanged: true, commentAdded: true },
  });

  const globalPrefs = {
    assigned:      workspacePrefs?.assigned      ?? true,
    mentioned:     workspacePrefs?.mentioned     ?? true,
    statusChanged: workspacePrefs?.statusChanged ?? true,
    commentAdded:  workspacePrefs?.commentAdded  ?? true,
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <FadeIn direction="down" className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Notification Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how you receive notifications for{" "}
          <span className="font-medium text-foreground">{project.name}</span>.
        </p>
      </FadeIn>

      <div className="max-w-2xl">
        <ProjectNotificationsForm
          projectId={project.id}
          projectName={project.name}
          projectKey={project.key}
          workspaceSlug={workspace.slug}
          isMuted={!!mute}
          globalPrefs={globalPrefs}
        />
      </div>
    </main>
  );
}
