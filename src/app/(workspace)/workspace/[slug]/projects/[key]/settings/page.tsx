import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { ProjectSettingsForm } from "./_components/project-settings-form";
import { ProjectDangerZone } from "./_components/project-danger-zone";

interface ProjectSettingsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({
  params,
}: ProjectSettingsPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Settings — ${key.toUpperCase()}` };
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  // Verify workspace membership — OWNER or ADMIN only
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    notFound();
  }

  const { workspace } = membership;

  const project = await prisma.project.findFirst({
    where: {
      workspaceId: workspace.id,
      key: key.toUpperCase(),
    },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
    },
  });

  if (!project) {
    notFound();
  }

  const isOwner = membership.role === "OWNER";

  return (
    <main className="flex-1 p-6">
      <FadeIn direction="down" className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Project Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the name, key, and other settings for{" "}
          <span className="font-medium text-foreground">{project.name}</span>.
        </p>
      </FadeIn>

      <div className="flex max-w-2xl flex-col gap-6">
        {/* General settings */}
        <FadeIn delay={0.05}>
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 text-base font-semibold text-foreground">
              General
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Update the project name, key, and description.
            </p>
            <ProjectSettingsForm
              projectId={project.id}
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              initialName={project.name}
              initialKey={project.key}
              initialDescription={project.description ?? ""}
            />
          </div>
        </FadeIn>

        {/* Danger zone — OWNER only */}
        {isOwner && (
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-destructive/30 bg-card p-6">
              <h2 className="mb-1 text-base font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                Irreversible actions that permanently affect this project.
              </p>
              <ProjectDangerZone
                projectId={project.id}
                projectName={project.name}
                workspaceSlug={workspace.slug}
              />
            </div>
          </FadeIn>
        )}
      </div>
    </main>
  );
}
