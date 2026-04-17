"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { FolderKanban } from "lucide-react";
import { StaggerChildren, fadeUpVariants } from "@/components/motion/fade-in";
import { CreateProjectDialog } from "../projects/_components/create-project-dialog";

interface ProjectItem {
  id: string;
  name: string;
  key: string;
  description: string | null;
  _count: { issues: number };
}

interface ProjectGridProps {
  projects: ProjectItem[];
  workspaceId: string;
  workspaceSlug: string;
  canCreate: boolean;
}

export function ProjectGrid({
  projects,
  workspaceId,
  workspaceSlug,
  canCreate,
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <FolderKanban className="size-6 text-primary" />
        </div>
        <h3 className="mt-3 text-sm font-semibold text-foreground">No projects yet</h3>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Create your first project to start tracking issues and sprints.
        </p>
        {canCreate && (
          <div className="mt-4">
            <CreateProjectDialog workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
          </div>
        )}
      </div>
    );
  }

  return (
    <StaggerChildren className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <motion.div key={project.id} variants={fadeUpVariants}>
          <Link
            href={`/workspace/${workspaceSlug}/projects/${project.key}`}
            className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {project.key.slice(0, 2)}
              </div>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {project.key}
              </span>
            </div>
            <h3 className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {project.name}
            </h3>
            {project.description ? (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground/50 italic">No description</p>
            )}
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
  );
}
