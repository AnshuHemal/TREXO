"use client";


import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, AlertTriangle, BarChart3, Clock,
  CheckCircle2, Circle, Eye, XCircle, AlertCircle,
  ArrowUp, ArrowDown, ArrowRight, Minus, Bug,
  BookOpen, GitBranch, RotateCcw, ExternalLink,
  LayoutGrid, List, Users, TrendingUp, Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkloadIssue {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  estimate: number | null;
  dueDate: Date | null;
  projectKey: string;
  projectName: string;
  sprintName: string | null;
  sprintEndDate: Date | null;
}

interface MemberWorkload {
  user: { id: string; name: string; image: string | null; email: string };
  role: string;
  totalIssues: number;
  totalPoints: number;
  overdueCount: number;
  byProject: { projectKey: string; projectName: string; count: number; points: number }[];
  byStatus: Record<string, number>;
  issues: WorkloadIssue[];
}

interface Project {
  id: string;
  name: string;
  key: string;
}

interface WorkloadClientProps {
  members: MemberWorkload[];
  projects: Project[];
  workspaceSlug: string;
  totalAssigned: number;
  totalPoints: number;
  unassignedCount: number;
  activeProjectId: string | null;
}

// ─── Load thresholds ──────────────────────────────────────────────────────────

const LOAD_THRESHOLDS = {
  NORMAL: { maxIssues: 5,  maxPoints: 20 },
  HEAVY:  { maxIssues: 10, maxPoints: 40 },
};

type LoadLevel = "empty" | "normal" | "heavy" | "overloaded";

function getLoadLevel(issues: number, points: number): LoadLevel {
  if (issues === 0 && points === 0) return "empty";
  if (
    issues <= LOAD_THRESHOLDS.NORMAL.maxIssues &&
    points <= LOAD_THRESHOLDS.NORMAL.maxPoints
  ) return "normal";
  if (
    issues <= LOAD_THRESHOLDS.HEAVY.maxIssues &&
    points <= LOAD_THRESHOLDS.HEAVY.maxPoints
  ) return "heavy";
  return "overloaded";
}

const LOAD_CONFIG: Record<LoadLevel, {
  label: string; bg: string; text: string; border: string;
  dot: string; rowBg: string; cardBorder: string;
}> = {
  empty: {
    label: "No work",
    bg: "bg-muted/30",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground/30",
    rowBg: "",
    cardBorder: "border-border",
  },
  normal: {
    label: "Normal",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    dot: "bg-emerald-500",
    rowBg: "",
    cardBorder: "border-emerald-500/30",
  },
  heavy: {
    label: "Heavy",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    dot: "bg-amber-500",
    rowBg: "bg-amber-500/5",
    cardBorder: "border-amber-500/30",
  },
  overloaded: {
    label: "Overloaded",
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/20",
    dot: "bg-destructive",
    rowBg: "bg-destructive/5",
    cardBorder: "border-destructive/30",
  },
};

// ─── Icon maps ────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  BACKLOG:     { icon: Circle,       color: "text-muted-foreground", label: "Backlog"     },
  TODO:        { icon: Circle,       color: "text-foreground",       label: "To Do"       },
  IN_PROGRESS: { icon: Clock,        color: "text-primary",          label: "In Progress" },
  IN_REVIEW:   { icon: Eye,          color: "text-yellow-500",       label: "In Review"   },
  DONE:        { icon: CheckCircle2, color: "text-emerald-500",      label: "Done"        },
  CANCELLED:   { icon: XCircle,      color: "text-muted-foreground", label: "Cancelled"   },
};

const PRIORITY_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  URGENT:      { icon: AlertCircle, color: "text-destructive",      label: "Urgent"      },
  HIGH:        { icon: ArrowUp,     color: "text-orange-500",       label: "High"        },
  MEDIUM:      { icon: ArrowRight,  color: "text-yellow-500",       label: "Medium"      },
  LOW:         { icon: ArrowDown,   color: "text-primary",          label: "Low"         },
  NO_PRIORITY: { icon: Minus,       color: "text-muted-foreground", label: "No priority" },
};

const TYPE_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  TASK:    { icon: CheckCircle2, color: "text-primary"          },
  BUG:     { icon: Bug,          color: "text-destructive"      },
  STORY:   { icon: BookOpen,     color: "text-primary"          },
  EPIC:    { icon: Zap,          color: "text-purple-500"       },
  SUBTASK: { icon: GitBranch,    color: "text-muted-foreground" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatRole(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(date),
  );
}

function isOverdue(date: Date | null) {
  if (!date) return false;
  return new Date(date) < new Date();
}

// ─── Stat card icon bg map ────────────────────────────────────────────────────

const STAT_ICON_BG: Record<string, string> = {
  "text-primary":          "bg-primary/10",
  "text-destructive":      "bg-destructive/10",
  "text-emerald-500":      "bg-emerald-500/10",
  "text-amber-500":        "bg-amber-500/10",
  "text-muted-foreground": "bg-muted-foreground/10",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color, delay,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay: number;
}) {
  const iconBg = STAT_ICON_BG[color] ?? "bg-primary/10";
  return (
    <FadeIn delay={delay}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-2xl font-bold", color)}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("flex size-9 items-center justify-center rounded-xl", iconBg)}>
            <Icon className={cn("size-5", color)} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Load badge ───────────────────────────────────────────────────────────────

function LoadBadge({ level }: { level: LoadLevel }) {
  const cfg = LOAD_CONFIG[level];
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      cfg.bg, cfg.text,
    )}>
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Status breakdown bar ─────────────────────────────────────────────────────

function StatusBar({
  byStatus,
  total,
  className,
}: {
  byStatus: Record<string, number>;
  total: number;
  className?: string;
}) {
  if (total === 0) return <span className="text-xs text-muted-foreground/40">—</span>;

  const segments = [
    { key: "IN_PROGRESS", color: "bg-primary" },
    { key: "IN_REVIEW",   color: "bg-yellow-500" },
    { key: "TODO",        color: "bg-foreground/25" },
    { key: "BACKLOG",     color: "bg-muted-foreground/20" },
  ];

  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-border", className)}>
      {segments.map(({ key, color }) => {
        const count = byStatus[key] ?? 0;
        if (count === 0) return null;
        return (
          <div
            key={key}
            className={cn("h-full transition-all", color)}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${STATUS_ICONS[key]?.label}: ${count}`}
          />
        );
      })}
    </div>
  );
}

// ─── Issue detail dialog ──────────────────────────────────────────────────────

function IssueDetailDialog({
  member,
  workspaceSlug,
  open,
  onClose,
}: {
  member: MemberWorkload | null;
  workspaceSlug: string;
  open: boolean;
  onClose: () => void;
}) {
  const [statusFilter, setStatusFilter]     = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  if (!member) return null;

  const filtered = member.issues.filter((i) => {
    if (statusFilter   !== "all" && i.status   !== statusFilter)   return false;
    if (priorityFilter !== "all" && i.priority !== priorityFilter) return false;
    return true;
  });

  const load = getLoadLevel(member.totalIssues, member.totalPoints);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[82vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 ring-2 ring-background">
              <AvatarImage src={member.user.image ?? undefined} />
              <AvatarFallback className="text-sm font-semibold">
                {getInitials(member.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-foreground">
                {member.user.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">{member.user.email}</p>
            </div>
            <LoadBadge level={load} />
          </div>

          {/* Stats */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="size-3.5" />
              <strong className="text-foreground">{member.totalIssues}</strong> issues
            </span>
            {member.totalPoints > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="size-3.5 text-primary" />
                <strong className="text-foreground">{member.totalPoints}</strong> pts
              </span>
            )}
            {member.overdueCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-destructive">
                <AlertTriangle className="size-3.5" />
                {member.overdueCount} overdue
              </span>
            )}
          </div>

          {/* Status bar */}
          {member.totalIssues > 0 && (
            <StatusBar
              byStatus={member.byStatus}
              total={member.totalIssues}
              className="mt-3"
            />
          )}

          {/* Filters */}
          <div className="mt-3 flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_ICONS).map(([v, { label }]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                {Object.entries(PRIORITY_ICONS).map(([v, { label }]) => (
                  <SelectItem key={v} value={v}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(statusFilter !== "all" || priorityFilter !== "all") && (
              <Button
                variant="ghost" size="sm"
                className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}
              >
                <RotateCcw className="size-3" /> Clear
              </Button>
            )}

            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "issue" : "issues"}
            </span>
          </div>
        </DialogHeader>

        {/* ── Issue list ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <BarChart3 className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No issues match the filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((issue, i) => {
                const statusCfg   = STATUS_ICONS[issue.status]     ?? STATUS_ICONS.TODO;
                const priorityCfg = PRIORITY_ICONS[issue.priority] ?? PRIORITY_ICONS.MEDIUM;
                const typeCfg     = TYPE_ICONS[issue.type]         ?? TYPE_ICONS.TASK;
                const StatusIcon   = statusCfg.icon;
                const PriorityIcon = priorityCfg.icon;
                const TypeIcon     = typeCfg.icon;
                const overdue = isOverdue(issue.dueDate);

                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.12, delay: i * 0.02 }}
                    className={cn(
                      "flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30",
                      overdue && "bg-destructive/3",
                    )}
                  >
                    <PriorityIcon className={cn("size-3.5 shrink-0", priorityCfg.color)} />
                    <TypeIcon     className={cn("size-3.5 shrink-0", typeCfg.color)} />

                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                      {issue.projectKey}-{issue.key}
                    </span>

                    <span className="flex-1 truncate text-sm text-foreground">
                      {issue.title}
                    </span>

                    {issue.sprintName && (
                      <span className="hidden shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:block">
                        {issue.sprintName}
                      </span>
                    )}

                    {issue.dueDate && (
                      <span className={cn(
                        "flex shrink-0 items-center gap-1 text-[10px]",
                        overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                      )}>
                        <Clock className="size-3" />
                        {formatDate(issue.dueDate)}
                        {overdue && " (overdue)"}
                      </span>
                    )}

                    <StatusIcon className={cn("size-3.5 shrink-0", statusCfg.color)} />

                    {issue.estimate != null && (
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {issue.estimate}
                      </span>
                    )}

                    <a
                      href={`/workspace/${workspaceSlug}/projects/${issue.projectKey}/issues/${issue.projectKey}-${issue.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-muted-foreground/40 transition-colors hover:text-primary"
                      aria-label="Open issue"
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Member card (grid view) ──────────────────────────────────────────────────

function MemberCard({
  member,
  index,
  onSelect,
}: {
  member: MemberWorkload;
  index: number;
  onSelect: (m: MemberWorkload) => void;
}) {
  const load = getLoadLevel(member.totalIssues, member.totalPoints);
  const cfg  = LOAD_CONFIG[load];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={() => onSelect(member)}
      className={cn(
        "group cursor-pointer rounded-xl border bg-card p-5 transition-all hover:shadow-md",
        cfg.cardBorder,
        cfg.rowBg,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0 ring-2 ring-background">
            <AvatarImage src={member.user.image ?? undefined} />
            <AvatarFallback className="text-sm font-semibold">
              {getInitials(member.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{member.user.name}</p>
            <p className="text-[11px] text-muted-foreground">{formatRole(member.role)}</p>
          </div>
        </div>
        <LoadBadge level={load} />
      </div>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <div className={cn("rounded-lg border p-3", cfg.border, cfg.bg)}>
          <p className="text-[10px] font-medium text-muted-foreground">Issues</p>
          <p className={cn("mt-0.5 text-xl font-bold tabular-nums", cfg.text)}>
            {member.totalIssues}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-[10px] font-medium text-muted-foreground">Story pts</p>
          <p className="mt-0.5 flex items-center gap-1 text-xl font-bold text-foreground">
            <Zap className="size-3.5 text-primary" />
            {member.totalPoints}
          </p>
        </div>
      </div>

      {/* Overdue warning */}
      {member.overdueCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          {member.overdueCount} overdue {member.overdueCount === 1 ? "issue" : "issues"}
        </div>
      )}

      {/* Status breakdown */}
      {member.totalIssues > 0 && (
        <div className="mt-3">
          <StatusBar byStatus={member.byStatus} total={member.totalIssues} />
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {["IN_PROGRESS", "IN_REVIEW", "TODO", "BACKLOG"].map((s) => {
              const count = member.byStatus[s] ?? 0;
              if (count === 0) return null;
              const sc   = STATUS_ICONS[s];
              const Icon = sc?.icon ?? Circle;
              return (
                <span key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Icon className={cn("size-2.5", sc?.color)} />
                  {count} {sc?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Projects */}
      {member.byProject.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {member.byProject.map((p) => (
            <span
              key={p.projectKey}
              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {p.projectKey} · {p.count}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {member.totalIssues === 0
            ? "No active issues"
            : `${member.totalIssues} active ${member.totalIssues === 1 ? "issue" : "issues"}`}
        </span>
        <Button
          variant="ghost" size="sm"
          className="h-6 gap-1 px-2 text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onSelect(member); }}
        >
          View <ExternalLink className="size-2.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Member row (table view) ──────────────────────────────────────────────────

function MemberRow({
  member,
  index,
  onSelect,
}: {
  member: MemberWorkload;
  index: number;
  onSelect: (m: MemberWorkload) => void;
}) {
  const load = getLoadLevel(member.totalIssues, member.totalPoints);
  const cfg  = LOAD_CONFIG[load];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "group cursor-pointer border-b border-border transition-colors hover:bg-muted/30",
        cfg.rowBg,
      )}
      onClick={() => onSelect(member)}
    >
      {/* Member */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar className="size-8 shrink-0 ring-2 ring-background">
            <AvatarImage src={member.user.image ?? undefined} />
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(member.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{member.user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{formatRole(member.role)}</p>
          </div>
        </div>
      </td>

      {/* Load */}
      <td className="px-4 py-3.5">
        <LoadBadge level={load} />
      </td>

      {/* Issues */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-lg font-bold tabular-nums",
            load === "overloaded" ? "text-destructive"
              : load === "heavy" ? "text-amber-500"
              : "text-foreground",
          )}>
            {member.totalIssues}
          </span>
          {member.overdueCount > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
              <AlertTriangle className="size-2.5" />
              {member.overdueCount}
            </span>
          )}
        </div>
      </td>

      {/* Points */}
      <td className="px-4 py-3.5">
        <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
          <Zap className="size-3.5 text-primary" />
          {member.totalPoints}
        </span>
      </td>

      {/* Status bar */}
      <td className="px-4 py-3.5">
        <StatusBar byStatus={member.byStatus} total={member.totalIssues} className="w-32" />
      </td>

      {/* Projects */}
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap gap-1">
          {member.byProject.slice(0, 3).map((p) => (
            <span
              key={p.projectKey}
              className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {p.projectKey} ({p.count})
            </span>
          ))}
          {member.byProject.length > 3 && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{member.byProject.length - 3}
            </span>
          )}
          {member.byProject.length === 0 && (
            <span className="text-xs text-muted-foreground/40">—</span>
          )}
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-3.5">
        <Button
          variant="ghost" size="sm"
          className="h-7 gap-1.5 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onSelect(member); }}
        >
          View issues <ExternalLink className="size-3" />
        </Button>
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkloadClient({
  members,
  projects,
  workspaceSlug,
  totalAssigned,
  totalPoints,
  unassignedCount,
  activeProjectId,
}: WorkloadClientProps) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode]         = useState<"grid" | "table">("table");
  const [sortBy, setSortBy]             = useState<"name" | "issues" | "points" | "load">("load");
  const [selectedMember, setSelectedMember] = useState<MemberWorkload | null>(null);
  const [dialogOpen, setDialogOpen]     = useState(false);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const overloadedCount = members.filter(
    (m) => getLoadLevel(m.totalIssues, m.totalPoints) === "overloaded",
  ).length;
  const heavyCount = members.filter(
    (m) => getLoadLevel(m.totalIssues, m.totalPoints) === "heavy",
  ).length;
  const avgIssues = members.length > 0
    ? Math.round(totalAssigned / members.length)
    : 0;

  // ── Sort members ──────────────────────────────────────────────────────────
  const sorted = [...members].sort((a, b) => {
    if (sortBy === "name")   return a.user.name.localeCompare(b.user.name);
    if (sortBy === "issues") return b.totalIssues - a.totalIssues;
    if (sortBy === "points") return b.totalPoints - a.totalPoints;
    // sort by load severity: overloaded > heavy > normal > empty
    const order: Record<LoadLevel, number> = { overloaded: 3, heavy: 2, normal: 1, empty: 0 };
    return (
      order[getLoadLevel(b.totalIssues, b.totalPoints)] -
      order[getLoadLevel(a.totalIssues, a.totalPoints)]
    );
  });

  // ── Project filter ────────────────────────────────────────────────────────
  function handleProjectFilter(projectId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (projectId) params.set("project", projectId);
    else params.delete("project");
    router.push(`${pathname}?${params.toString()}`);
  }

  // ── Open dialog ───────────────────────────────────────────────────────────
  function handleSelectMember(m: MemberWorkload) {
    setSelectedMember(m);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total assigned"
          value={totalAssigned}
          sub={`across ${members.length} members`}
          icon={BarChart3}
          color="text-primary"
          delay={0}
        />
        <StatCard
          label="Total story pts"
          value={totalPoints}
          sub="active issues"
          icon={Zap}
          color="text-primary"
          delay={0.04}
        />
        <StatCard
          label="Overloaded"
          value={overloadedCount}
          sub={heavyCount > 0 ? `+${heavyCount} heavy` : "members"}
          icon={AlertTriangle}
          color={overloadedCount > 0 ? "text-destructive" : "text-muted-foreground"}
          delay={0.08}
        />
        <StatCard
          label="Unassigned"
          value={unassignedCount}
          sub="issues need owner"
          icon={Users}
          color={unassignedCount > 0 ? "text-amber-500" : "text-muted-foreground"}
          delay={0.12}
        />
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Project filter */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Filter className="size-3.5" />
              Project
            </div>
            <Select
              value={activeProjectId ?? "all"}
              onValueChange={(v) => handleProjectFilter(v === "all" ? null : v)}
            >
              <SelectTrigger className={cn(
                "h-8 w-44 text-xs",
                activeProjectId && "border-primary text-primary",
              )}>
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="flex size-4 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                        {p.key.charAt(0)}
                      </span>
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="size-3.5" />
              Sort
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="load">By load</SelectItem>
                <SelectItem value="issues">By issues</SelectItem>
                <SelectItem value="points">By points</SelectItem>
                <SelectItem value="name">By name</SelectItem>
              </SelectContent>
            </Select>

            {/* Active filter chip */}
            <AnimatePresence>
              {activeProjectId && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => handleProjectFilter(null)}
                  className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  {projects.find((p) => p.id === activeProjectId)?.name ?? "Project"}
                  <span className="ml-0.5 text-primary/60">×</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
            {([
              { key: "table", icon: List,        label: "Table" },
              { key: "grid",  icon: LayoutGrid,  label: "Grid"  },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  viewMode === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-label={label}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <FadeIn delay={0.12}>
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card px-5 py-3">
          <span className="text-xs font-medium text-muted-foreground">Load legend:</span>
          {(["normal", "heavy", "overloaded"] as LoadLevel[]).map((level) => {
            const cfg = LOAD_CONFIG[level];
            const thresholds =
              level === "normal"     ? `≤${LOAD_THRESHOLDS.NORMAL.maxIssues} issues / ≤${LOAD_THRESHOLDS.NORMAL.maxPoints} pts`
              : level === "heavy"    ? `≤${LOAD_THRESHOLDS.HEAVY.maxIssues} issues / ≤${LOAD_THRESHOLDS.HEAVY.maxPoints} pts`
              : `>${LOAD_THRESHOLDS.HEAVY.maxIssues} issues or >${LOAD_THRESHOLDS.HEAVY.maxPoints} pts`;
            return (
              <span key={level} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("size-2 rounded-full", cfg.dot)} />
                <span className={cn("font-medium", cfg.text)}>{cfg.label}</span>
                <span className="text-muted-foreground/60">({thresholds})</span>
              </span>
            );
          })}
          <span className="ml-auto text-xs text-muted-foreground">
            Avg {avgIssues} issues/member
          </span>
        </div>
      </FadeIn>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Load</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Issues</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Story pts</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status breakdown</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Projects</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="size-8 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">No members found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sorted.map((member, i) => (
                      <MemberRow
                        key={member.user.id}
                        member={member}
                        index={i}
                        onSelect={handleSelectMember}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {sorted.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
                <Users className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No members found</p>
              </div>
            ) : (
              sorted.map((member, i) => (
                <MemberCard
                  key={member.user.id}
                  member={member}
                  index={i}
                  onSelect={handleSelectMember}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Issue detail dialog ─────────────────────────────────────────────── */}
      <IssueDetailDialog
        member={selectedMember}
        workspaceSlug={workspaceSlug}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
