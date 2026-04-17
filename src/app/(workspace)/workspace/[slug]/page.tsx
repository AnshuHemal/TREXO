import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Users, FolderKanban, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "./_components/workspace-topbar";
import { ProjectGrid } from "./_components/project-grid";
import { CreateProjectDialog } from "./projects/_components/create-project-dialog";

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

  const recentProjects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      _count: { select: { issues: true } },
    },
  });

  const stats = [
    { label: "Members",  value: workspace._count.members,  icon: Users,        description: "People in this workspace" },
    { label: "Projects", value: workspace._count.projects, icon: FolderKanban, description: "Active projects" },
  ];

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Home"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening in{" "}
            <span className="font-medium text-foreground">{workspace.name}</span>.
          </p>
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {/* Projects section */}
        <FadeIn delay={0.2} className="mt-8">
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
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>

          {/* ProjectGrid is a client component — motion.div lives there */}
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
