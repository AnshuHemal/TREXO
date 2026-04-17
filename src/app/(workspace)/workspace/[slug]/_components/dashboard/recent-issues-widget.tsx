"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { getStatusConfig, getPriorityConfig } from "@/lib/issue-config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentIssueItem {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  updatedAt: Date;
  projectKey: string;
  projectName: string;
  workspaceSlug: string;
}

interface RecentIssuesWidgetProps {
  issues: RecentIssueItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecentIssuesWidget({ issues }: RecentIssuesWidgetProps) {
  return (
    <FadeIn delay={0.35}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <RefreshCw className="size-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Recently Updated</h3>
        </div>

        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent issue activity.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {issues.map((issue, i) => {
              const status   = getStatusConfig(issue.status);
              const priority = getPriorityConfig(issue.priority);
              const StatusIcon   = status.icon;
              const PriorityIcon = priority.icon;

              return (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/40 transition-colors"
                >
                  <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />

                  <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                    <Link
                      href={`/workspace/${issue.workspaceSlug}/projects/${issue.projectKey}/backlog`}
                      className="truncate text-sm text-foreground hover:text-primary transition-colors"
                    >
                      {issue.title}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{issue.projectKey}-{issue.key}</span>
                      <span>·</span>
                      <span>{issue.projectName}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1">
                      <StatusIcon className={cn("size-3", status.color)} />
                      <span className="text-[11px] text-muted-foreground">{status.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground/60">{formatRelative(issue.updatedAt)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
