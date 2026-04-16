import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { GeneralSettingsForm } from "./_components/general-settings-form";
import { DangerZone } from "./_components/danger-zone";

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `Settings — ${workspace.name}` : "Settings" };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const user = await requireUser();

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
  const isOwner = membership.role === "OWNER";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Settings"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Workspace Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your workspace name, URL, and other preferences.
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
                Update your workspace name and URL.
              </p>
              <GeneralSettingsForm
                workspaceId={workspace.id}
                initialName={workspace.name}
                initialSlug={workspace.slug}
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
                  Irreversible actions that affect the entire workspace.
                </p>
                <DangerZone
                  workspaceId={workspace.id}
                  workspaceName={workspace.name}
                />
              </div>
            </FadeIn>
          )}
        </div>
      </main>
    </div>
  );
}
