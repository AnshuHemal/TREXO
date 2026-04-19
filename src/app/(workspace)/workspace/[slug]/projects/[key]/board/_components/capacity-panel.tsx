"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users, Zap, AlertTriangle, ChevronDown, ChevronUp,
  Settings2, CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { BoardIssue } from "../../_components/kanban-board";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CapacityPanelProps {
  issues: BoardIssue[];
  members: Member[];
  defaultCapacity?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function MemberCapacityBar({
  member,
  used,
  capacity,
  issueCount,
  index,
}: {
  member: Member;
  used: number;
  capacity: number;
  issueCount: number;
  index: number;
}) {
  const pct  = capacity > 0 ? Math.min((used / capacity) * 100, 100) : 0;
  const over = used > capacity;
  const warn = !over && pct >= 80;
  const ok   = !over && !warn;

  const barColor = over ? "bg-destructive" : warn ? "bg-amber-500" : "bg-emerald-500";
  const textColor = over ? "text-destructive" : warn ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  const bgColor = over ? "bg-destructive/5" : warn ? "bg-amber-500/5" : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border border-border p-3 transition-colors",
        bgColor,
        over && "border-destructive/20",
        warn && "border-amber-500/20",
      )}
    >
      {/* Member row */}
      <div className="flex items-center gap-2.5">
        <Avatar className="size-7 shrink-0 ring-2 ring-background">
          <AvatarImage src={member.image ?? undefined} />
          <AvatarFallback className="text-[10px] font-semibold">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground">{member.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {issueCount} {issueCount === 1 ? "issue" : "issues"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn("text-xs font-bold tabular-nums", textColor)}>
            {used}/{capacity}
          </span>
          <span className="text-[10px] text-muted-foreground">pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className={cn("h-full rounded-full", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.04 + 0.1 }}
        />
      </div>

      {/* Status label */}
      <div className="flex items-center justify-between">
        <span className={cn("flex items-center gap-1 text-[10px] font-medium", textColor)}>
          {over && <><AlertTriangle className="size-3" />{used - capacity} pts over capacity</>}
          {warn && <><AlertTriangle className="size-3" />{Math.round(pct)}% of capacity</>}
          {ok && used > 0 && <><CheckCircle2 className="size-3" />{Math.round(pct)}% of capacity</>}
          {ok && used === 0 && <span className="text-muted-foreground">No issues assigned</span>}
        </span>
        {used > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {capacity - used > 0 ? `${capacity - used} pts free` : ""}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CapacityPanel({ issues, members, defaultCapacity = 20 }: CapacityPanelProps) {
  const [capacity, setCapacity]     = useState(defaultCapacity);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Compute per-member stats
  const memberStats = members.map((m) => {
    const memberIssues = issues.filter(
      (i) => i.assigneeId === m.id && i.type !== "SUBTASK",
    );
    const used = memberIssues.reduce((s, i) => s + (i.estimate ?? 0), 0);
    return { member: m, used, issueCount: memberIssues.length };
  });

  // Only show members with issues OR all members if none have issues
  const hasAnyIssues = memberStats.some((s) => s.issueCount > 0);
  const visibleStats = hasAnyIssues
    ? memberStats.filter((s) => s.issueCount > 0)
    : memberStats;

  const totalUsed     = memberStats.reduce((s, m) => s + m.used, 0);
  const totalCapacity = members.length * capacity;
  const overloadedCount = memberStats.filter((s) => s.used > capacity).length;
  const unestimatedCount = issues.filter(
    (i) => i.estimate == null && i.type !== "SUBTASK" && i.assigneeId !== null,
  ).length;

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-background">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <Users className="size-4 text-primary" />
          Capacity
          {overloadedCount > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              {overloadedCount}
            </span>
          )}
          {isExpanded
            ? <ChevronUp className="size-3.5 text-muted-foreground" />
            : <ChevronDown className="size-3.5 text-muted-foreground" />
          }
        </button>

        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          className={cn(
            "flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            showSettings && "bg-accent text-foreground",
          )}
          title="Configure capacity"
        >
          <Settings2 className="size-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col overflow-hidden"
          >
            {/* Settings row */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden border-b border-border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      Capacity per member
                    </label>
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1">
                      <Zap className="size-3 text-primary" />
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={capacity}
                        onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-transparent text-center text-xs font-semibold text-foreground focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">pts/sprint</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Team summary */}
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Team total</span>
                <span className={cn(
                  "font-bold tabular-nums",
                  totalUsed > totalCapacity ? "text-destructive"
                  : totalUsed / totalCapacity >= 0.8 ? "text-amber-500"
                  : "text-foreground",
                )}>
                  {totalUsed}/{totalCapacity} pts
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-border">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    totalUsed > totalCapacity ? "bg-destructive"
                    : totalUsed / totalCapacity >= 0.8 ? "bg-amber-500"
                    : "bg-primary",
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${totalCapacity > 0 ? Math.min((totalUsed / totalCapacity) * 100, 100) : 0}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              {unestimatedCount > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-500">
                  <AlertTriangle className="size-3" />
                  {unestimatedCount} assigned {unestimatedCount === 1 ? "issue" : "issues"} without estimates
                </p>
              )}
            </div>

            {/* Per-member bars */}
            <div className="flex flex-col gap-2 overflow-y-auto p-3">
              {visibleStats.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="size-7 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No issues assigned yet</p>
                </div>
              ) : (
                visibleStats.map(({ member, used, issueCount }, i) => (
                  <MemberCapacityBar
                    key={member.id}
                    member={member}
                    used={used}
                    capacity={capacity}
                    issueCount={issueCount}
                    index={i}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
