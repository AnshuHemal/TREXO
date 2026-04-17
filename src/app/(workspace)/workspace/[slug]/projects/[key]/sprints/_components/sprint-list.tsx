"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Timer } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { CreateSprintDialog } from "./create-sprint-dialog";
import { SprintCard, type SprintData, type SprintIssue } from "./sprint-card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SprintListProps {
  project: { id: string; name: string; key: string };
  sprints: SprintData[];
  backlogIssues: SprintIssue[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SprintList({ project, sprints: initialSprints, backlogIssues }: SprintListProps) {
  const [sprints, setSprints] = useState<SprintData[]>(initialSprints);

  function handleSprintCreated(sprintId: string) {
    // Reload to get fresh data from server
    window.location.reload();
    void sprintId;
  }

  function handleSprintUpdated() {
    window.location.reload();
  }

  function handleSprintDeleted(sprintId: string) {
    setSprints((prev) => prev.filter((s) => s.id !== sprintId));
  }

  const otherSprints = sprints
    .filter((s) => s.status === "PLANNED")
    .map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <FadeIn direction="down" className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sprints</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sprints.length === 0
              ? "No sprints yet. Create your first sprint to start planning."
              : `${sprints.length} ${sprints.length === 1 ? "sprint" : "sprints"}`}
          </p>
        </div>
        <CreateSprintDialog
          projectId={project.id}
          onSuccess={handleSprintCreated}
        />
      </FadeIn>

      {/* Empty state */}
      {sprints.length === 0 && (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10">
              <Timer className="size-7 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">No sprints yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Sprints help you plan and track work in time-boxed iterations.
            </p>
            <div className="mt-6">
              <CreateSprintDialog
                projectId={project.id}
                onSuccess={handleSprintCreated}
              />
            </div>
          </div>
        </FadeIn>
      )}

      {/* Sprint cards */}
      <AnimatePresence initial={false}>
        {sprints.map((sprint, i) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            projectId={project.id}
            projectKey={project.key}
            otherSprints={otherSprints}
            backlogIssues={backlogIssues}
            index={i}
            onUpdated={handleSprintUpdated}
            onDeleted={handleSprintDeleted}
          />
        ))}
      </AnimatePresence>

      {/* Backlog section */}
      {backlogIssues.length > 0 && (
        <FadeIn delay={0.1} className="mt-2">
          <BacklogSection issues={backlogIssues} projectKey={project.key} />
        </FadeIn>
      )}
    </div>
  );
}

// ─── Backlog section ──────────────────────────────────────────────────────────

function BacklogSection({
  issues,
  projectKey,
}: {
  issues: SprintIssue[];
  projectKey: string;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="font-semibold text-foreground">Backlog</span>
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {issues.length}
        </span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto text-muted-foreground"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="divide-y divide-border">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                  <span className="font-mono text-xs text-muted-foreground">{projectKey}-{issue.key}</span>
                  <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>
                  {issue.assignee && (
                    <span className="text-xs text-muted-foreground">{issue.assignee.name}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
