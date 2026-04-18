"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, AreaChart, Area,
} from "recharts";
import {
  Zap, TrendingUp, Target, Activity,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getStatusConfig, getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VelocityPoint {
  sprintId: string;
  sprintName: string;
  startDate: Date | null;
  endDate: Date | null;
  committed: number;
  completed: number;
  completedCount: number;
  totalCount: number;
}

interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

interface ActiveSprintIssue {
  id: string; key: number; title: string;
  status: string; priority: string; type: string;
  estimate: number | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface ActiveSprintSummary {
  id: string; name: string; goal: string | null;
  startDate: Date | null; endDate: Date | null;
  totalIssues: number; doneIssues: number;
  totalPoints: number; donePoints: number;
  issues: ActiveSprintIssue[];
}

interface AnalyticsClientProps {
  project: { id: string; name: string; key: string };
  workspaceSlug: string;
  velocityData: VelocityPoint[];
  burndownData: BurndownPoint[];
  cfdData: Array<{ date: string; BACKLOG: number; TODO: number; IN_PROGRESS: number; IN_REVIEW: number; DONE: number }>;
  activeSprint: ActiveSprintSummary | null;
  completedSprintCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function getDaysRemaining(endDate: Date | null) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
  return diff;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, color, delay,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color: string; delay: number;
}) {
  return (
    <FadeIn delay={delay}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn("mt-1.5 text-2xl font-bold", color)}>{value}</p>
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn("flex size-9 items-center justify-center rounded-xl", `${color.replace("text-", "bg-")}/10`)}>
            <Icon className={cn("size-5", color)} />
          </div>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Custom tooltips ──────────────────────────────────────────────────────────

function VelocityTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
}

function BurndownTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3.5 py-2.5 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold text-foreground">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
}

// ─── CFD colors ───────────────────────────────────────────────────────────────

const CFD_COLORS: Record<string, string> = {
  BACKLOG:     "hsl(var(--muted-foreground) / 0.3)",
  TODO:        "hsl(var(--foreground) / 0.2)",
  IN_PROGRESS: "#6366f1",
  IN_REVIEW:   "#eab308",
  DONE:        "#22c55e",
};

const CFD_LABELS: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review", DONE: "Done",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyticsClient({
  project,
  workspaceSlug,
  velocityData,
  burndownData,
  cfdData,
  activeSprint,
  completedSprintCount,
}: AnalyticsClientProps) {
  const [activeTab, setActiveTab] = useState<"velocity" | "burndown" | "flow">("velocity");

  // Velocity stats
  const avgVelocity = velocityData.length > 0
    ? Math.round(velocityData.reduce((s, d) => s + d.completed, 0) / velocityData.length)
    : 0;
  const lastVelocity = velocityData.at(-1)?.completed ?? 0;
  const velocityTrend = velocityData.length >= 2
    ? lastVelocity - (velocityData.at(-2)?.completed ?? 0)
    : 0;

  // Active sprint stats
  const sprintProgress = activeSprint && activeSprint.totalIssues > 0
    ? Math.round((activeSprint.doneIssues / activeSprint.totalIssues) * 100)
    : 0;
  const daysLeft = activeSprint ? getDaysRemaining(activeSprint.endDate) : null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div>
          <h1 className="text-base font-bold text-foreground">Analytics</h1>
          <p className="text-xs text-muted-foreground">{project.name} · {completedSprintCount} completed sprints</p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
          {([
            { key: "velocity", label: "Velocity", icon: Zap },
            { key: "burndown", label: "Burndown", icon: TrendingUp },
            { key: "flow",     label: "Flow",     icon: Activity },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Avg velocity"
            value={`${avgVelocity} pts`}
            sub="per sprint"
            icon={Zap}
            color="text-primary"
            delay={0}
          />
          <StatCard
            label="Last sprint"
            value={`${lastVelocity} pts`}
            sub={velocityTrend > 0 ? `↑ ${velocityTrend} vs prev` : velocityTrend < 0 ? `↓ ${Math.abs(velocityTrend)} vs prev` : "Same as prev"}
            icon={TrendingUp}
            color={velocityTrend >= 0 ? "text-emerald-500" : "text-destructive"}
            delay={0.04}
          />
          <StatCard
            label="Sprint progress"
            value={activeSprint ? `${sprintProgress}%` : "—"}
            sub={activeSprint ? `${activeSprint.doneIssues}/${activeSprint.totalIssues} issues` : "No active sprint"}
            icon={Target}
            color="text-primary"
            delay={0.08}
          />
          <StatCard
            label="Days remaining"
            value={daysLeft !== null ? (daysLeft < 0 ? "Overdue" : `${daysLeft}d`) : "—"}
            sub={activeSprint?.name ?? "No active sprint"}
            icon={Clock}
            color={daysLeft !== null && daysLeft <= 2 ? "text-destructive" : "text-amber-500"}
            delay={0.12}
          />
        </div>

        {/* ── Charts ─────────────────────────────────────────────────────── */}

        {/* Velocity chart */}
        {activeTab === "velocity" && (
          <div className="flex flex-col gap-6">
            <FadeIn delay={0.1}>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <Zap className="size-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Velocity Chart</h2>
                      <p className="text-xs text-muted-foreground">Story points committed vs completed per sprint</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-primary/30" />
                      Committed
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-sm bg-primary" />
                      Completed
                    </span>
                  </div>
                </div>

                {velocityData.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Zap className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No completed sprints yet</p>
                    <p className="text-xs text-muted-foreground/60">Complete sprints with story point estimates to see velocity</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={velocityData} barGap={3} barCategoryGap="35%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="sprintName"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false}
                          tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false} width={32}
                        />
                        <Tooltip content={<VelocityTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                        <Bar dataKey="committed" name="committed" radius={[4, 4, 0, 0]} fill="var(--primary)" opacity={0.3} />
                        <Bar dataKey="completed" name="completed" radius={[4, 4, 0, 0]}>
                          {velocityData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={entry.completed >= entry.committed ? "#22c55e" : "var(--primary)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
            </FadeIn>

            {/* Sprint history table */}
            {velocityData.length > 0 && (
              <FadeIn delay={0.15}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-foreground">Sprint History</h2>
                  </div>
                  <div className="divide-y divide-border">
                    {velocityData.slice().reverse().map((sprint, i) => {
                      const pct = sprint.committed > 0
                        ? Math.round((sprint.completed / sprint.committed) * 100)
                        : 0;
                      const isGood = pct >= 80;

                      return (
                        <motion.div
                          key={sprint.sprintId}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: i * 0.04 }}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{sprint.sprintName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-right">
                              <p className="font-medium text-foreground">{sprint.completedCount}/{sprint.totalCount}</p>
                              <p className="text-muted-foreground">issues</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">{sprint.completed}/{sprint.committed}</p>
                              <p className="text-muted-foreground">points</p>
                            </div>
                            <div className={cn(
                              "flex size-10 items-center justify-center rounded-full text-xs font-bold",
                              isGood ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                            )}>
                              {pct}%
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        )}

        {/* Burndown chart */}
        {activeTab === "burndown" && (
          <div className="flex flex-col gap-6">
            <FadeIn delay={0.1}>
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                      <TrendingUp className="size-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Burndown Chart
                        {activeSprint && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            — {activeSprint.name}
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground">Story points remaining vs ideal burndown</p>
                    </div>
                  </div>
                  {activeSprint && (
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-muted-foreground/40" />
                        Ideal
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm bg-primary" />
                        Actual
                      </span>
                    </div>
                  )}
                </div>

                {!activeSprint ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <TrendingUp className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No active sprint</p>
                    <p className="text-xs text-muted-foreground/60">Start a sprint to see the burndown chart</p>
                  </div>
                ) : burndownData.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <TrendingUp className="size-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No date range set</p>
                    <p className="text-xs text-muted-foreground/60">Set start and end dates on the sprint to see burndown</p>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={burndownData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false} tickLine={false} width={32}
                        />
                        <Tooltip content={<BurndownTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="ideal"
                          name="ideal"
                          stroke="var(--muted-foreground)"
                          strokeWidth={1.5}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="remaining"
                          name="remaining"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          dot={{ fill: "var(--primary)", r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                )}
              </div>
            </FadeIn>

            {/* Active sprint issue breakdown */}
            {activeSprint && (
              <FadeIn delay={0.15}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-foreground">
                      {activeSprint.name} — Issue Breakdown
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{activeSprint.doneIssues}/{activeSprint.totalIssues} done</span>
                      {activeSprint.totalPoints > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          <Zap className="size-2.5" />
                          {activeSprint.donePoints}/{activeSprint.totalPoints} pts
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {activeSprint.issues.map((issue, i) => {
                      const status   = getStatusConfig(issue.status);
                      const priority = getPriorityConfig(issue.priority);
                      const type     = getTypeConfig(issue.type);
                      const StatusIcon   = status.icon;
                      const PriorityIcon = priority.icon;
                      const TypeIcon     = type.icon;
                      const isDone = issue.status === "DONE" || issue.status === "CANCELLED";

                      return (
                        <motion.div
                          key={issue.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.12, delay: i * 0.03 }}
                          className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/30 transition-colors"
                        >
                          <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                          <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
                          <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                            {project.key}-{issue.key}
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
                          {issue.assignee && (
                            <Avatar className="size-5 shrink-0">
                              <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        )}

        {/* Cumulative flow diagram */}
        {activeTab === "flow" && (
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Activity className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Cumulative Flow Diagram</h2>
                    <p className="text-xs text-muted-foreground">Issue distribution across statuses — last 14 days</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["DONE", "IN_REVIEW", "IN_PROGRESS", "TODO", "BACKLOG"].map((s) => (
                    <span key={s} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className="size-2 rounded-sm" style={{ backgroundColor: CFD_COLORS[s] }} />
                      {CFD_LABELS[s]}
                    </span>
                  ))}
                </div>
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cfdData} stackOffset="none">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false} tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false} tickLine={false} width={32}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        fontSize: "11px",
                      }}
                    />
                    {["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map((s) => (
                      <Area
                        key={s}
                        type="monotone"
                        dataKey={s}
                        name={CFD_LABELS[s]}
                        stackId="1"
                        stroke={CFD_COLORS[s]}
                        fill={CFD_COLORS[s]}
                        fillOpacity={0.8}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  A healthy CFD shows the DONE area growing steadily while IN_PROGRESS stays thin.
                  Wide IN_PROGRESS bands indicate WIP limit issues.
                </p>
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
