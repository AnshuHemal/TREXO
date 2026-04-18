"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from "recharts";
import {
  Activity, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, TrendingDown, Users, Zap, Target,
  Circle, Eye, XCircle, AlertCircle,
  ArrowUp, ArrowDown, ArrowRight, Minus,
  Bug, BookOpen, GitBranch,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusCount    { status: string;   count: number }
interface PriorityCount  { priority: string; count: number }
interface TypeCount      { type: string;     count: number }
interface TrendPoint     { date: string; opened: number; closed: number }
interface Contributor    {
  user: { id: string; name: string; image: string | null };
  count: number;
  points: number;
}

interface HealthClientProps {
  project: { id: string; name: string; key: string };
  workspaceSlug: string;
  statusCounts: StatusCount[];
  priorityCounts: PriorityCount[];
  typeCounts: TypeCount[];
  trendData: TrendPoint[];
  avgCycleTime: number | null;
  cycleTimeSampleSize: number;
  topContributors: Contributor[];
  activeSprintName: string | null;
  totalIssues: number;
  openIssues: number;
  doneIssues: number;
  overdueCount: number;
}

// ─── Static color maps (Tailwind-safe) ───────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; hex: string; icon: React.ElementType }> = {
  BACKLOG:     { label: "Backlog",     color: "text-muted-foreground", hex: "#94a3b8", icon: Circle       },
  TODO:        { label: "To Do",       color: "text-foreground",       hex: "#e2e8f0", icon: Circle       },
  IN_PROGRESS: { label: "In Progress", color: "text-primary",          hex: "#6366f1", icon: Clock        },
  IN_REVIEW:   { label: "In Review",   color: "text-yellow-500",       hex: "#eab308", icon: Eye          },
  DONE:        { label: "Done",        color: "text-emerald-500",      hex: "#22c55e", icon: CheckCircle2 },
  CANCELLED:   { label: "Cancelled",   color: "text-muted-foreground", hex: "#64748b", icon: XCircle      },
};

const PRIORITY_CONFIG: Record<string, { label: string; hex: string; icon: React.ElementType; color: string }> = {
  URGENT:      { label: "Urgent",      hex: "#ef4444", icon: AlertCircle, color: "text-destructive"    },
  HIGH:        { label: "High",        hex: "#f97316", icon: ArrowUp,     color: "text-orange-500"     },
  MEDIUM:      { label: "Medium",      hex: "#eab308", icon: ArrowRight,  color: "text-yellow-500"     },
  LOW:         { label: "Low",         hex: "#6366f1", icon: ArrowDown,   color: "text-primary"        },
  NO_PRIORITY: { label: "No priority", hex: "#94a3b8", icon: Minus,       color: "text-muted-foreground" },
};

const TYPE_CONFIG: Record<string, { label: string; hex: string; icon: React.ElementType; color: string }> = {
  TASK:    { label: "Task",    hex: "#6366f1", icon: CheckCircle2, color: "text-primary"          },
  BUG:     { label: "Bug",     hex: "#ef4444", icon: Bug,          color: "text-destructive"      },
  STORY:   { label: "Story",   hex: "#8b5cf6", icon: BookOpen,     color: "text-purple-500"       },
  EPIC:    { label: "Epic",    hex: "#a855f7", icon: Zap,          color: "text-purple-500"       },
  SUBTASK: { label: "Subtask", hex: "#94a3b8", icon: GitBranch,    color: "text-muted-foreground" },
};

const STAT_ICON_BG: Record<string, string> = {
  "text-primary":          "bg-primary/10",
  "text-destructive":      "bg-destructive/10",
  "text-emerald-500":      "bg-emerald-500/10",
  "text-amber-500":        "bg-amber-500/10",
  "text-muted-foreground": "bg-muted/40",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color, delay, trend,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay: number;
  trend?: "up" | "down" | "neutral";
}) {
  const iconBg = STAT_ICON_BG[color] ?? "bg-primary/10";
  return (
    <FadeIn delay={delay}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              {trend === "up" && <TrendingUp className="size-3.5 text-emerald-500" />}
              {trend === "down" && <TrendingDown className="size-3.5 text-destructive" />}
            </div>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", iconBg)}>
            <Icon className={cn("size-5", color)} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl">
      {label && <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="capitalize text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Donut chart with center label ───────────────────────────────────────────

function DonutChart({
  data,
  total,
  centerLabel,
  centerSub,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  centerLabel: string;
  centerSub: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0];
              const pct = total > 0 ? Math.round(((p.value as number) / total) * 100) : 0;
              return (
                <div className="rounded-xl border border-border bg-popover px-3 py-2 shadow-xl text-xs">
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-muted-foreground">{p.value as number} issues ({pct}%)</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-foreground">{centerLabel}</p>
        <p className="text-[11px] text-muted-foreground">{centerSub}</p>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  sub,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
}: {
  icon: React.ElementType;
  title: string;
  sub?: string;
  iconColor?: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("flex size-9 items-center justify-center rounded-xl", iconBg)}>
        <Icon className={cn("size-5", iconColor)} />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HealthClient({
  project,
  workspaceSlug,
  statusCounts,
  priorityCounts,
  typeCounts,
  trendData,
  avgCycleTime,
  cycleTimeSampleSize,
  topContributors,
  activeSprintName,
  totalIssues,
  openIssues,
  doneIssues,
  overdueCount,
}: HealthClientProps) {
  const [trendView, setTrendView] = useState<"30d" | "14d" | "7d">("30d");

  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  // Slice trend data based on view
  const visibleTrend =
    trendView === "7d"  ? trendData.slice(-7)
    : trendView === "14d" ? trendData.slice(-14)
    : trendData;

  // ── Status donut data ─────────────────────────────────────────────────────
  const statusDonutData = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      name:  STATUS_CONFIG[s.status]?.label ?? s.status,
      value: s.count,
      color: STATUS_CONFIG[s.status]?.hex ?? "#94a3b8",
    }));

  // ── Priority bar data ─────────────────────────────────────────────────────
  const priorityOrder = ["URGENT", "HIGH", "MEDIUM", "LOW", "NO_PRIORITY"];
  const priorityBarData = priorityOrder
    .map((p) => ({
      name:  PRIORITY_CONFIG[p]?.label ?? p,
      value: priorityCounts.find((r) => r.priority === p)?.count ?? 0,
      color: PRIORITY_CONFIG[p]?.hex ?? "#94a3b8",
    }))
    .filter((d) => d.value > 0);

  // ── Type donut data ───────────────────────────────────────────────────────
  const typeDonutData = typeCounts
    .filter((t) => t.count > 0)
    .map((t) => ({
      name:  TYPE_CONFIG[t.type]?.label ?? t.type,
      value: t.count,
      color: TYPE_CONFIG[t.type]?.hex ?? "#94a3b8",
    }));

  // ── Health score (simple heuristic) ──────────────────────────────────────
  // 0-100: penalise overdue, reward completion rate, penalise high urgent count
  const urgentCount = priorityCounts.find((p) => p.priority === "URGENT")?.count ?? 0;
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      completionRate
        - Math.min(30, overdueCount * 5)
        - Math.min(20, urgentCount * 3),
    ),
  );
  const healthLabel =
    healthScore >= 75 ? "Healthy"
    : healthScore >= 50 ? "Needs attention"
    : "At risk";
  const healthColor =
    healthScore >= 75 ? "text-emerald-500"
    : healthScore >= 50 ? "text-amber-500"
    : "text-destructive";
  const healthBg =
    healthScore >= 75 ? "bg-emerald-500"
    : healthScore >= 50 ? "bg-amber-500"
    : "bg-destructive";

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div>
          <h1 className="text-base font-bold text-foreground">Project Health</h1>
          <p className="text-xs text-muted-foreground">
            {project.name} · {totalIssues} total issues
          </p>
        </div>
        {/* Health score pill */}
        <div className={cn(
          "flex items-center gap-2 rounded-full border px-3 py-1.5",
          healthScore >= 75 ? "border-emerald-500/20 bg-emerald-500/10"
          : healthScore >= 50 ? "border-amber-500/20 bg-amber-500/10"
          : "border-destructive/20 bg-destructive/10",
        )}>
          <div className={cn("size-2 rounded-full", healthBg)} />
          <span className={cn("text-xs font-semibold", healthColor)}>
            {healthLabel}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className={cn("text-xs font-bold tabular-nums", healthColor)}>
            {healthScore}/100
          </span>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total issues"
            value={totalIssues}
            sub={`${openIssues} open`}
            icon={Activity}
            color="text-primary"
            delay={0}
          />
          <StatCard
            label="Completion"
            value={`${completionRate}%`}
            sub={`${doneIssues} done`}
            icon={CheckCircle2}
            color={completionRate >= 70 ? "text-emerald-500" : "text-primary"}
            delay={0.04}
            trend={completionRate >= 70 ? "up" : undefined}
          />
          <StatCard
            label="Avg cycle time"
            value={avgCycleTime !== null ? `${avgCycleTime}d` : "—"}
            sub={avgCycleTime !== null ? `${cycleTimeSampleSize} issues sampled` : "No closed issues yet"}
            icon={Clock}
            color="text-amber-500"
            delay={0.08}
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            sub="past due date"
            icon={AlertTriangle}
            color={overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}
            delay={0.12}
            trend={overdueCount > 0 ? "down" : undefined}
          />
        </div>

        {/* ── Row 1: Status donut + Priority breakdown ──────────────────── */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Status donut */}
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader
                icon={Target}
                title="Issues by Status"
                sub="Current distribution across all statuses"
              />
              <div className="mt-5">
                {statusDonutData.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Target className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No issues yet</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <DonutChart
                      data={statusDonutData}
                      total={totalIssues}
                      centerLabel={String(totalIssues)}
                      centerSub="total"
                    />
                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                      {statusCounts
                        .filter((s) => s.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((s) => {
                          const cfg = STATUS_CONFIG[s.status];
                          const Icon = cfg?.icon ?? Circle;
                          const pct = Math.round((s.count / totalIssues) * 100);
                          return (
                            <div key={s.status} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon className={cn("size-3 shrink-0", cfg?.color)} />
                                <span className="truncate text-xs text-muted-foreground">
                                  {cfg?.label ?? s.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-semibold text-foreground">{s.count}</span>
                                <span className="text-[10px] text-muted-foreground/60">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Priority breakdown */}
          <FadeIn delay={0.14}>
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader
                icon={AlertTriangle}
                title="Open Issues by Priority"
                sub="Active issues that need attention"
                iconColor="text-amber-500"
                iconBg="bg-amber-500/10"
              />
              <div className="mt-5">
                {priorityBarData.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CheckCircle2 className="size-8 text-emerald-500/40" />
                    <p className="text-sm text-muted-foreground">No open issues</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart
                        data={priorityBarData}
                        layout="vertical"
                        barCategoryGap="25%"
                        margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                      >
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false}
                          width={80}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                        <Bar dataKey="value" name="issues" radius={[0, 4, 4, 0]}>
                          {priorityBarData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Priority rows with progress bars */}
                    <div className="mt-4 flex flex-col gap-2">
                      {priorityBarData.map((p) => {
                        const total = priorityBarData.reduce((s, d) => s + d.value, 0);
                        const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
                        return (
                          <div key={p.name} className="flex items-center gap-3">
                            <span className="w-20 shrink-0 text-xs text-muted-foreground">{p.name}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: p.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                              />
                            </div>
                            <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground">
                              {p.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ── Row 2: Open issues trend ──────────────────────────────────── */}
        <FadeIn delay={0.18}>
          <div className="mb-6 rounded-xl border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <SectionHeader
                icon={TrendingUp}
                title="Open Issues Trend"
                sub="Issues opened vs closed over time"
              />
              {/* Time range toggle */}
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
                {(["7d", "14d", "30d"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTrendView(v)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      trendView === v
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" />
                Opened
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-500" />
                Closed
              </span>
            </div>

            <motion.div
              key={trendView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={visibleTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false} tickLine={false}
                    interval={trendView === "7d" ? 0 : trendView === "14d" ? 1 : 4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false} tickLine={false}
                    width={28}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="opened"
                    name="opened"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "var(--primary)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="closed"
                    name="closed"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: "#22c55e" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </FadeIn>

        {/* ── Row 3: Type breakdown + Top contributors ──────────────────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Issue type donut */}
          <FadeIn delay={0.22}>
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader
                icon={Activity}
                title="Issues by Type"
                sub="Distribution across issue types"
                iconColor="text-purple-500"
                iconBg="bg-purple-500/10"
              />
              <div className="mt-5">
                {typeDonutData.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Activity className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No issues yet</p>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <DonutChart
                      data={typeDonutData}
                      total={totalIssues}
                      centerLabel={String(totalIssues)}
                      centerSub="issues"
                    />
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
                      {typeCounts
                        .filter((t) => t.count > 0)
                        .sort((a, b) => b.count - a.count)
                        .map((t) => {
                          const cfg = TYPE_CONFIG[t.type];
                          const Icon = cfg?.icon ?? Circle;
                          const pct = Math.round((t.count / totalIssues) * 100);
                          return (
                            <div key={t.type} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon className={cn("size-3 shrink-0", cfg?.color)} />
                                <span className="truncate text-xs text-muted-foreground">
                                  {cfg?.label ?? t.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-semibold text-foreground">{t.count}</span>
                                <span className="text-[10px] text-muted-foreground/60">({pct}%)</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Top contributors */}
          <FadeIn delay={0.26}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <SectionHeader
                  icon={Users}
                  title="Top Contributors"
                  sub={
                    activeSprintName
                      ? `Issues closed in ${activeSprintName}`
                      : "Issues closed across all sprints"
                  }
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                />
              </div>

              {topContributors.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <Users className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {activeSprintName
                      ? "No issues closed in this sprint yet"
                      : "No closed issues yet"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topContributors.map((c, i) => {
                    const maxCount = topContributors[0]?.count ?? 1;
                    const barPct = Math.round((c.count / maxCount) * 100);
                    const medal =
                      i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                    return (
                      <motion.div
                        key={c.user.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.15, delay: i * 0.04 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Rank */}
                        <span className="w-5 shrink-0 text-center text-sm">
                          {medal ?? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {i + 1}
                            </span>
                          )}
                        </span>

                        {/* Avatar */}
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={c.user.image ?? undefined} />
                          <AvatarFallback className="text-[10px] font-semibold">
                            {getInitials(c.user.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name + bar */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {c.user.name}
                          </p>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
                            <motion.div
                              className="h-full rounded-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 + i * 0.04 }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-foreground">
                            {c.count}
                          </span>
                          {c.points > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Zap className="size-2.5 text-primary" />
                              {c.points} pts
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </FadeIn>
        </div>

        {/* ── Cycle time insight ────────────────────────────────────────── */}
        {avgCycleTime !== null && (
          <FadeIn delay={0.3}>
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10">
                  <Clock className="size-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    Average cycle time: <span className="text-amber-500">{avgCycleTime} days</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Measured from issue creation to first DONE transition · {cycleTimeSampleSize} issues sampled
                  </p>
                </div>
                <div className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  avgCycleTime <= 3  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : avgCycleTime <= 7  ? "bg-primary/10 text-primary"
                  : avgCycleTime <= 14 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-destructive/10 text-destructive",
                )}>
                  {avgCycleTime <= 3  ? "Excellent"
                  : avgCycleTime <= 7  ? "Good"
                  : avgCycleTime <= 14 ? "Needs improvement"
                  : "Slow"}
                </div>
              </div>
            </div>
          </FadeIn>
        )}

      </div>
    </div>
  );
}
