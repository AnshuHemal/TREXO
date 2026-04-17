"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";
import { BarChart3 } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { ISSUE_STATUSES } from "@/lib/issue-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatusCount {
  status: string;
  count: number;
}

interface StatusChartProps {
  data: StatusCount[];
  totalIssues: number;
}

// ─── Color map — uses CSS variables via inline style ─────────────────────────

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     "hsl(var(--muted-foreground) / 0.4)",
  TODO:        "hsl(var(--foreground) / 0.3)",
  IN_PROGRESS: "var(--color-primary, #6366f1)",
  IN_REVIEW:   "#eab308",
  DONE:        "var(--color-primary, #6366f1)",
  CANCELLED:   "hsl(var(--muted-foreground) / 0.2)",
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const label = ISSUE_STATUSES.find((s) => s.value === name)?.label ?? name;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{value} {value === 1 ? "issue" : "issues"}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusChart({ data, totalIssues }: StatusChartProps) {
  const filtered = data.filter((d) => d.count > 0);

  return (
    <FadeIn delay={0.3}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="size-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Issue Status</h3>
        </div>

        {totalIssues === 0 ? (
          <p className="text-sm text-muted-foreground">No issues yet.</p>
        ) : (
          <div className="flex items-center gap-4">
            {/* Donut chart */}
            <div className="relative shrink-0">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={filtered.map((d) => ({ name: d.status, value: d.count }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={54}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                    animationBegin={200}
                    animationDuration={600}
                  >
                    {filtered.map((d) => (
                      <Cell key={d.status} fill={STATUS_COLORS[d.status] ?? "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{totalIssues}</span>
                <span className="text-[10px] text-muted-foreground">total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-1 flex-col gap-1.5">
              {filtered.map((d, i) => {
                const label = ISSUE_STATUSES.find((s) => s.value === d.status)?.label ?? d.status;
                const pct   = Math.round((d.count / totalIssues) * 100);
                return (
                  <motion.div
                    key={d.status}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.3 + i * 0.05 }}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[d.status] ?? "#6366f1" }}
                    />
                    <span className="flex-1 truncate text-xs text-muted-foreground">{label}</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{d.count}</span>
                    <span className="w-8 text-right text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
