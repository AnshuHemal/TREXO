import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn, StaggerChildren, fadeUpVariants } from "@/components/motion/fade-in";
import { motion } from "motion/react";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { CreateProjectDialog } from "./_components/create-project-dialog";

interface ProjectsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProjectsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `Projects — ${workspace.name}` : "Projects" };
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    notFound();
  }

  const { workspace } = membership;
  const canCreate = membership.role === "OWNER" || membership.role === "ADMIN";

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      description: true,
      icon: true,
      createdAt: true,
      _count: { select: { issues: true } },
    },
  });

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Projects"
      />

      <main className="flex-1 p-6">
        {/* Header */}
        <FadeIn direction="down" className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Projects
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length === 0
                ? "No projects yet."
                : `${projects.length} ${projects.length === 1 ? "project" : "projects"} in this workspace.`}
            </p>
          </div>
          {canCreate && (
            <CreateProjectDialog
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
            />
          )}
        </FadeIn>

        {/* Empty state */}
        {projects.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
              <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
                <FolderKanban className="size-7 text-primary" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">
                No projects yet
              </h2>
              <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                Projects help you organise your work. Create your first project to get started.
              </p>
              {canCreate && (
                <div className="mt-6">
                  <CreateProjectDialog
                    workspaceId={workspace.id}
                    workspaceSlug={workspace.slug}
                  />
                </div>
              )}
            </div>
          </FadeIn>
        ) : (
          <StaggerChildren className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <motion.div key={project.id} variants={fadeUpVariants}>
                <Link
                  href={`/workspace/${slug}/projects/${project.key}`}
                  className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  {/* Icon + key */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {project.key.slice(0, 2)}
                    </div>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                      {project.key}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {project.name}
                  </h3>

                  {/* Description */}
                  {project.description ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground/50 italic">
                      No description
                    </p>
                  )}

                  {/* Issue count */}
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <FolderKanban className="size-3.5" />
                    <span>
                      {project._count.issues}{" "}
                      {project._count.issues === 1 ? "issue" : "issues"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </StaggerChildren>
        )}
      </main>
    </div>
  );
}
