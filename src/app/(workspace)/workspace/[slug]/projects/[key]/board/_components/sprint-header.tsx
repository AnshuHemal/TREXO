"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompleteSprintDialog } from "../../sprints/_components/complete-sprint-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SprintHeaderProps {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date | null;
    endDate: Date | null;
    totalIssues: number;
    doneIssues: number;
  };
  otherSprints: { id: string; name: string }[];
  onCompleted: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function getDaysRemaining(endDate: Date | null): { days: number; isOverdue: boolean } | null {
  if (!endDate) return null;
  const now  = new Date();
  const end  = new Date(endDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { days: Math.abs(diff), isOverdue: diff < 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SprintHeader({ sprint, otherSprints, onCompleted }: SprintHeaderProps) {
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [goalExpanded, setGoalExpanded]             = useState(false);

  const progress     = sprint.totalIssues > 0
    ? Math.round((sprint.doneIssues / sprint.totalIssues) * 100)
    : 0;
  const remaining    = sprint.totalIssues - sprint.doneIssues;
  const daysInfo     = getDaysRemaining(sprint.endDate);
  const isNearEnd    = daysInfo && !daysInfo.isOverdue && daysInfo.days <= 2;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="border-b border-border bg-background/95 backdrop-blur-sm"
      >
        {/* Main header row */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          {/* Sprint name + active badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-bold text-foreground">
                  {sprint.name}
                </h2>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-5 w-px bg-border sm:block" />

          {/* Dates */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3.5 shrink-0" />
            <span>{formatDate(sprint.startDate)}</span>
            <span>–</span>
            <span>{formatDate(sprint.endDate)}</span>
          </div>

          {/* Days remaining */}
          {daysInfo && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              daysInfo.isOverdue
                ? "bg-destructive/10 text-destructive"
                : isNearEnd
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-muted text-muted-foreground",
            )}>
              {daysInfo.isOverdue
                ? <AlertTriangle className="size-3" />
                : <Clock className="size-3" />
              }
              {daysInfo.isOverdue
                ? `${daysInfo.days}d overdue`
                : daysInfo.days === 0
                  ? "Due today"
                  : `${daysInfo.days}d left`
              }
            </div>
          )}

          {/* Divider */}
          <div className="hidden h-5 w-px bg-border sm:block" />

          {/* Progress stats */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{sprint.doneIssues}</span>
              /{sprint.totalIssues} done
            </span>
            {remaining > 0 && (
              <span className="text-muted-foreground">
                · <span className="font-medium text-foreground">{remaining}</span> remaining
              </span>
            )}
          </div>

          {/* Goal toggle */}
          {sprint.goal && (
            <button
              onClick={() => setGoalExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Target className="size-3.5" />
              Goal
              {goalExpanded
                ? <ChevronUp className="size-3" />
                : <ChevronDown className="size-3" />
              }
            </button>
          )}

          {/* Complete sprint button */}
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setShowCompleteDialog(true)}
            >
              <CheckCircle2 className="size-3.5" />
              Complete sprint
            </Button>
          </div>
        </div>

        {/* Sprint goal (expandable) */}
        <AnimatePresence>
          {sprint.goal && goalExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
                <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{sprint.goal}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="h-1 w-full bg-border">
          <motion.div
            className={cn(
              "h-full transition-colors",
              progress === 100 ? "bg-emerald-500" : "bg-primary",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </motion.div>

      {/* Complete sprint dialog */}
      <CompleteSprintDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        sprintId={sprint.id}
        sprintName={sprint.name}
        incompleteCount={remaining}
        otherSprints={otherSprints}
        onCompleted={onCompleted}
      />
    </>
  );
}
