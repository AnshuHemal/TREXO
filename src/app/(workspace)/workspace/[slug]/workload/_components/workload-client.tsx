"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronDown, BarChart2, CalendarDays, Zap,
  AlertCircle, User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig, getPriorityConfig } from "@/lib/issue-config";
import { isOverdue } from "@/lib/due-date";
import { cn } from "@/lib/utils";
import { fadeUpVariants } from "@/components/motion/fade-in";
import { StaggerChildren } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

interface Issue {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  estimate: number | null;
  assigneeId: string | null;
  project: { key: string; name: string };
}

interface WorkloadClientProps {
  members: Member[];
  issues: Issue[];
  currentUserId: string;
  workspaceSlug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const MAX_BAR = 10; // issues for 100% bar width

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberWorkloadRow({
  member,
  issues,
  isCurrentUser,
}: {
  member: Member;
  issues: Issue[];
  isCurrentUser: boolean;
}) {
  const [expanded, setExpanded] = useState(isCurrentUser);

  const totalPoints = issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
  const overdueCount = issues.filter((i) => isOverdue(i.dueDate, i.status)).length;
  const barWidth = Math.min((issues.length / MAX_BAR) * 100, 100);
  const isOverloaded = issues.length > MAX_BAR;

  return (
    <motion.div
      variants={fadeUpVariants}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <Avatar className="size-9 shrink-0">
          <AvatarFallback className="text-xs font-semibold">{getInitials(member.name)}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">
              {member.name}
              {isCurrentUser && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
            </span>
            {overdueCount > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                <AlertCircle className="size-2.5" />
                {overdueCount} overdue
              </span>
            )}
          </div>

          {/* Load bar */}
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <motion.div
                className={cn("h-full rounded-full", isOverloaded ? "bg-destructive" : "bg-primary")}
                initial={{ width: 0 }}
                animate={{ width: `${barWidth}%` }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
              />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {issues.length} issue{issues.length !== 1 ? "s" : ""}
            </span>
            {totalPoints > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                <Zap className="size-3 text-primary" />
                {totalPoints} pts
              </span>
            )}
          </div>
        </div>

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="size-4" />
        </motion.span>
      </button>

      {/* Issue list */}
      <AnimatePresence>
        {expanded && issues.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="divide-y divide-border">
              {issues.map((issue) => {
                const status   = getStatusConfig(issue.status);
                const priority = getPriorityConfig(issue.priority);
                const StatusIcon   = status.icon;
                const PriorityIcon = priority.icon;
                const overdue = isOverdue(issue.dueDate, issue.status);

                return (
                  <div
                    key={issue.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                    <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                      {issue.project.key}-{issue.key}
                    </span>
                    <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>

                    {issue.estimate != null && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        <Zap className="size-2.5" />{issue.estimate}
                      </span>
                    )}

                    {overdue && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                        <CalendarDays className="size-2.5" />
                        Overdue
                      </span>
                    )}

                    <StatusIcon className={cn("size-3.5 shrink-0", status.color)} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
        {expanded && issues.length === 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <p className="px-4 py-4 text-sm text-muted-foreground">No open issues assigned.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkloadClient({ members, issues, currentUserId }: WorkloadClientProps) {
  // Group issues by assignee
  const issuesByMember = new Map<string, Issue[]>();
  for (const member of members) {
    issuesByMember.set(member.id, []);
  }
  for (const issue of issues) {
    if (issue.assigneeId && issuesByMember.has(issue.assigneeId)) {
      issuesByMember.get(issue.assigneeId)!.push(issue);
    }
  }

  // Sort: most loaded first, current user always first
  const sorted = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return (issuesByMember.get(b.id)?.length ?? 0) - (issuesByMember.get(a.id)?.length ?? 0);
  });

  const totalOpen   = issues.length;
  const totalPoints = issues.reduce((s, i) => s + (i.estimate ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: "Open issues",   value: totalOpen,          icon: BarChart2 },
          { label: "Story points",  value: totalPoints || "—", icon: Zap       },
          { label: "Team members",  value: members.length,     icon: User      },
        ].map(({ label, value, icon: Icon }) => (
          <motion.div
            key={label}
            variants={fadeUpVariants}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Member rows */}
      <StaggerChildren className="flex flex-col gap-3">
        {sorted.map((member) => (
          <MemberWorkloadRow
            key={member.id}
            member={member}
            issues={issuesByMember.get(member.id) ?? []}
            isCurrentUser={member.id === currentUserId}
          />
        ))}
      </StaggerChildren>
    </div>
  );
}
