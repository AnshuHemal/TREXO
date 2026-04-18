"use client";

import Link from "next/link";
import { useTransition } from "react";
import { motion } from "motion/react";
import { Zap, ArrowRight, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { startSprint } from "../../sprints/actions";

interface NoActiveSprintProps {
  project: { id: string; name: string; key: string };
  workspaceSlug: string;
  plannedSprints: { id: string; name: string }[];
}

export function NoActiveSprint({
  project,
  workspaceSlug,
  plannedSprints,
}: NoActiveSprintProps) {
  const [isPending, startTransition] = useTransition();

  function handleStartSprint(sprintId: string) {
    startTransition(async () => {
      const result = await startSprint(sprintId);
      if (result.success) {
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <FadeIn className="flex max-w-md flex-col items-center text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex size-20 items-center justify-center rounded-2xl bg-primary/10"
        >
          <Zap className="size-10 text-primary" />
        </motion.div>

        <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground">
          No active sprint
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Start a sprint to see the board. Issues in the active sprint will appear here as Kanban columns.
        </p>

        {/* Planned sprints to start */}
        {plannedSprints.length > 0 && (
          <div className="mt-8 w-full">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Planned sprints
            </p>
            <div className="flex flex-col gap-2">
              {plannedSprints.map((sprint) => (
                <motion.div
                  key={sprint.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">{sprint.name}</span>
                  <Button
                    size="sm"
                    className="h-7 gap-1.5 px-3 text-xs"
                    onClick={() => handleStartSprint(sprint.id)}
                    disabled={isPending}
                  >
                    {isPending
                      ? <Loader2 className="size-3.5 animate-spin" />
                      : <Play className="size-3.5" />
                    }
                    Start sprint
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href={`/workspace/${workspaceSlug}/projects/${project.key}/sprints`}>
              Manage sprints
              <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/workspace/${workspaceSlug}/projects/${project.key}/backlog`}>
              Go to backlog
            </Link>
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}
