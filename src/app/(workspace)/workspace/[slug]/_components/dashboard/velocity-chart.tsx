"use client";

import { motion } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Zap } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VelocityDataPoint {
  sprintName: string;
  committed: number;
  completed: number;
}

interface VelocityChartProps {
  data: VelocityDataPoint[];
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VelocityChart({ data }: VelocityChartProps) {
  const hasData = data.some((d) => d.committed > 0 || d.completed > 0);

  return (
    <FadeIn delay={0.25}>
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Velocity</h3>
              <p className="text-xs text-muted-foreground">Story points per sprint</p>
            </div>
          </div>
          {hasData && (
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary/40" />
                Committed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                Completed
              </span>
            </div>
          )}
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="mb-2 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No story points set yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Add estimates to issues to track velocity
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data} barGap={2} barCategoryGap="30%">
                <XAxis
                  dataKey="sprintName"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + "…" : v}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
                <Bar dataKey="committed" name="committed" radius={[3, 3, 0, 0]} fill="var(--primary)" opacity={0.35} />
                <Bar dataKey="completed" name="completed" radius={[3, 3, 0, 0]}>
                  {data.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.completed >= entry.committed ? "var(--primary)" : "var(--primary)"}
                      opacity={entry.completed >= entry.committed ? 1 : 0.7}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>
    </FadeIn>
  );
}
