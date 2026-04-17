"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Timer, ArrowRight, CalendarDays } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SprintIssueCount {
  total: number;
  done: number;
}

interface ActiveSprintData {
  id: string;
  name: string;
  goal: string | null;
  startDate: Date | null;
  endDate: Date | null;
  projectName: string;
  projectKey: string;
  workspaceSlug: string;
  issueCounts: SprintIssueCount;
}

interface ActiveSprintWidgetProps {
  sprint: ActiveSprintData | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null;
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActiveSprintWidget({ sprint }: ActiveSprintWidgetProps) {
  if (!sprint) {
    return (
      <FadeIn delay={0.15}>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Active Sprint</h3>
          </div>
          <p className="text-sm text-muted-foreground">No active sprint across your projects.</p>
        </div>
      </FadeIn>
    );
  }

  const { total, done } = sprint.issueCounts;
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
  const days    = daysRemaining(sprint.endDate);
  const isUrgent = days !== null && days <= 2;

  return (
    <FadeIn delay={0.15}>
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Timer className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{sprint.projectName}</p>
              <h3 className="text-sm font-semibold text-foreground">{sprint.name}</h3>
            </div>
          </div>
          <Link
            href={`/workspace/${sprint.workspaceSlug}/projects/${sprint.projectKey}/sprints`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
          >
            View <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* Goal */}
        {sprint.goal && (
          <p className="mb-4 text-xs text-muted-foreground line-clamp-2">{sprint.goal}</p>
        )}

        {/* Progress */}
        <div className="mb-3 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{done}/{total} issues done</span>
            <span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            <span>{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</span>
          </div>
          {days !== null && (
            <span className={isUrgent ? "font-semibold text-destructive" : "text-muted-foreground"}>
              {days === 0 ? "Ends today" : `${days}d left`}
            </span>
          )}
        </div>
      </div>
    </FadeIn>
  );
}
