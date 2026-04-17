"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CircleUser, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { getPriorityConfig, getStatusConfig } from "@/lib/issue-config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyIssueItem {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  projectKey: string;
  workspaceSlug: string;
}

interface MyIssuesWidgetProps {
  issues: MyIssueItem[];
  workspaceSlug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MyIssuesWidget({ issues, workspaceSlug }: MyIssuesWidgetProps) {
  return (
    <FadeIn delay={0.2}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <CircleUser className="size-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">My Open Issues</h3>
          </div>
          <Link
            href={`/workspace/${workspaceSlug}/my-issues`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all <ArrowRight className="size-3" />
          </Link>
        </div>

        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open issues assigned to you.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {issues.map((issue, i) => {
              const priority = getPriorityConfig(issue.priority);
              const status   = getStatusConfig(issue.status);
              const PriorityIcon = priority.icon;
              const StatusIcon   = status.icon;

              return (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-accent/40 transition-colors"
                >
                  <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                  <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">
                    {issue.projectKey}-{issue.key}
                  </span>
                  <Link
                    href={`/workspace/${issue.workspaceSlug}/projects/${issue.projectKey}/backlog`}
                    className="flex-1 truncate text-sm text-foreground hover:text-primary transition-colors"
                  >
                    {issue.title}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <StatusIcon className={cn("size-3.5", status.color)} />
                    <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
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
