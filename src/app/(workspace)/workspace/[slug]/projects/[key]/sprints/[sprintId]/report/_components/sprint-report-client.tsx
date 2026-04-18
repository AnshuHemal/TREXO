"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft, CheckCircle2, AlertCircle, Zap,
  Calendar, Target, TrendingUp, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getStatusConfig, getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportIssue {
  id: string; key: number; title: string;
  type: string; status: string; priority: string;
  estimate: number | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface SprintReport {
  id: string; name: string; goal: string | null; status: string;
  startDate: Date | null; endDate: Date | null;
  totalIssues: number; completedIssues: number; carriedOver: number;
  totalPoints: number; completedPoints: number;
  completed: ReportIssue[];
  carriedOverList: ReportIssue[];
}

interface SprintReportClientProps {
  project: { id: string; name: string; key: string };
  workspaceSlug: string;
  report: SprintReport;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(date));
}

function getDuration(start: Date | null, end: Date | null) {
  if (!start || !end) return null;
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({ issue, projectKey, index }: { issue: ReportIssue; projectKey: string; index: number }) {
  const status   = getStatusConfig(issue.status);
  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);
  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;
  const isDone = issue.status === "DONE" || issue.status === "CANCELLED";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors"
    >
      <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
      <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {projectKey}-{issue.key}
      </span>
      <span className={cn(
        "flex-1 truncate text-sm",
        isDone ? "line-through text-muted-foreground" : "text-foreground",
      )}>
        {issue.title}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>
      {issue.estimate != null && (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {issue.estimate}
        </span>
      )}
      {issue.assignee ? (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={issue.assignee.image ?? undefined} />
          <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-5 shrink-0 rounded-full border border-dashed border-border" />
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SprintReportClient({ project, workspaceSlug, report }: SprintReportClientProps) {
  const completionRate = report.totalIssues > 0
    ? Math.round((report.completedIssues / report.totalIssues) * 100)
    : 0;
  const pointsRate = report.totalPoints > 0
    ? Math.round((report.completedPoints / report.totalPoints) * 100)
    : 0;
  const duration = getDuration(report.startDate, report.endDate);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <FadeIn direction="down">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" asChild>
              <Link href={`/workspace/${workspaceSlug}/projects/${project.key}/sprints`}>
                <ArrowLeft className="size-3.5" />
                Sprints
              </Link>
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium text-foreground">{report.name} — Report</span>
          </div>
        </FadeIn>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl flex flex-col gap-6">

          {/* Sprint meta */}
          <FadeIn direction="down">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <BarChart3 className="size-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-foreground">{report.name}</h1>
                      <p className="text-xs text-muted-foreground">Sprint Report</p>
                    </div>
                  </div>
                  {report.goal && (
                    <div className="mt-3 flex items-start gap-2">
                      <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">{report.goal}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatDate(report.startDate)} – {formatDate(report.endDate)}
                  </div>
                  {duration && <span>{duration}</span>}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "Completion rate",
                value: `${completionRate}%`,
                sub: `${report.completedIssues}/${report.totalIssues} issues`,
                icon: TrendingUp,
                color: completionRate >= 80 ? "text-emerald-500" : completionRate >= 50 ? "text-amber-500" : "text-destructive",
                delay: 0,
              },
              {
                label: "Points delivered",
                value: `${report.completedPoints}`,
                sub: `of ${report.totalPoints} committed`,
                icon: Zap,
                color: "text-primary",
                delay: 0.04,
              },
              {
                label: "Completed",
                value: report.completedIssues,
                sub: "issues done",
                icon: CheckCircle2,
                color: "text-emerald-500",
                delay: 0.08,
              },
              {
                label: "Carried over",
                value: report.carriedOver,
                sub: "moved to backlog",
                icon: AlertCircle,
                color: report.carriedOver > 0 ? "text-amber-500" : "text-muted-foreground",
                delay: 0.12,
              },
            ].map(({ label, value, sub, icon: Icon, color, delay }) => (
              <FadeIn key={label} delay={delay}>
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className={cn("mt-1.5 text-2xl font-bold", color)}>{value}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <div className={cn("flex size-8 items-center justify-center rounded-lg", `${color.replace("text-", "bg-")}/10`)}>
                      <Icon className={cn("size-4", color)} />
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Progress bar */}
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Sprint completion</span>
                <span className="font-bold text-foreground">{completionRate}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-border">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    completionRate === 100 ? "bg-emerald-500" : "bg-primary",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionRate}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              {report.totalPoints > 0 && (
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Story points: {report.completedPoints}/{report.totalPoints}</span>
                  <span>{pointsRate}% of committed points delivered</span>
                </div>
              )}
            </div>
          </FadeIn>

          {/* Completed issues */}
          <FadeIn delay={0.15}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-foreground">
                  Completed ({report.completedIssues})
                </h2>
              </div>
              {report.completed.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">No issues completed.</p>
              ) : (
                <div className="divide-y divide-border">
                  {report.completed.map((issue, i) => (
                    <IssueRow key={issue.id} issue={issue} projectKey={project.key} index={i} />
                  ))}
                </div>
              )}
            </div>
          </FadeIn>

          {/* Carried over issues */}
          {report.carriedOverList.length > 0 && (
            <FadeIn delay={0.2}>
              <div className="rounded-xl border border-amber-500/30 bg-card overflow-hidden">
                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
                  <AlertCircle className="size-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Carried Over ({report.carriedOver})
                  </h2>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Moved to backlog
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {report.carriedOverList.map((issue, i) => (
                    <IssueRow key={issue.id} issue={issue} projectKey={project.key} index={i} />
                  ))}
                </div>
              </div>
            </FadeIn>
          )}

          {/* Actions */}
          <FadeIn delay={0.25}>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href={`/workspace/${workspaceSlug}/projects/${project.key}/sprints`}>
                  Back to sprints
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/workspace/${workspaceSlug}/projects/${project.key}/analytics`}>
                  <BarChart3 className="mr-1.5 size-4" />
                  View analytics
                </Link>
              </Button>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
