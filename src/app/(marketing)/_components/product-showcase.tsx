"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Kanban,
  List,
  BarChart3,
  Map,
  Clock,
  ChevronRight,
} from "lucide-react";

// ─── Tab data ─────────────────────────────────────────────────────────────────

const TABS = [
  {
    id: "board",
    label: "Board",
    icon: Kanban,
    description: "Visualize work in progress with drag-and-drop Kanban columns, swimlanes, and WIP limits.",
    preview: <BoardPreview />,
  },
  {
    id: "backlog",
    label: "Backlog",
    icon: List,
    description: "Manage your full issue backlog with grouping, sorting, bulk actions, and saved filters.",
    preview: <BacklogPreview />,
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: Map,
    description: "Plan quarters ahead with a horizontal timeline showing sprints, epics, and progress.",
    preview: <RoadmapPreview />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    description: "Track velocity, status distribution, and team performance with built-in charts.",
    preview: <AnalyticsPreview />,
  },
  {
    id: "time",
    label: "Time",
    icon: Clock,
    description: "Log time per issue and view team-wide time reports grouped by member.",
    preview: <TimePreview />,
  },
];

// ─── Preview components ───────────────────────────────────────────────────────

function BoardPreview() {
  const cols = [
    { name: "Todo", count: 4, color: "bg-muted-foreground/20" },
    { name: "In Progress", count: 3, color: "bg-primary/20" },
    { name: "In Review", count: 2, color: "bg-yellow-500/20" },
    { name: "Done", count: 6, color: "bg-emerald-500/20" },
  ];
  return (
    <div className="flex gap-3 p-4">
      {cols.map((col) => (
        <div key={col.name} className="flex w-36 flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${col.color}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {col.name}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/50">{col.count}</span>
          </div>
          {Array.from({ length: Math.min(col.count, 3) }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-background p-2.5 shadow-sm">
              <div className="mb-2 h-2 w-3/4 rounded bg-muted" />
              <div className="h-1.5 w-1/2 rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function BacklogPreview() {
  const issues = [
    { key: "TRX-42", title: "Implement OAuth login", priority: "high", status: "Todo" },
    { key: "TRX-41", title: "Add sprint velocity chart", priority: "medium", status: "In Progress" },
    { key: "TRX-40", title: "Fix mobile sidebar", priority: "high", status: "In Review" },
    { key: "TRX-39", title: "Custom workflow editor", priority: "medium", status: "Todo" },
    { key: "TRX-38", title: "Email notification system", priority: "low", status: "Done" },
  ];
  const priorityColor: Record<string, string> = {
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };
  return (
    <div className="p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        <span className="w-16">Key</span>
        <span className="flex-1">Title</span>
        <span className="w-20">Status</span>
      </div>
      <div className="flex flex-col gap-1">
        {issues.map((issue) => (
          <div key={issue.key} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <span className="w-16 shrink-0 text-[10px] font-mono text-muted-foreground">{issue.key}</span>
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <span className={`size-1.5 shrink-0 rounded-full ${priorityColor[issue.priority]}`} />
              <span className="truncate text-[11px] text-foreground">{issue.title}</span>
            </div>
            <span className="w-20 shrink-0 text-right text-[10px] text-muted-foreground">{issue.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoadmapPreview() {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const bars = [
    { label: "Sprint 1", left: "0%", width: "28%", color: "bg-primary/60" },
    { label: "Sprint 2", left: "30%", width: "28%", color: "bg-primary/60" },
    { label: "Sprint 3", left: "60%", width: "28%", color: "bg-primary/60" },
    { label: "Epic: Auth", left: "0%", width: "45%", color: "bg-purple-500/50" },
    { label: "Epic: Board", left: "47%", width: "40%", color: "bg-orange-500/50" },
  ];
  return (
    <div className="p-4">
      {/* Month headers */}
      <div className="mb-2 flex">
        {months.map((m) => (
          <div key={m} className="flex-1 text-center text-[10px] text-muted-foreground/60">{m}</div>
        ))}
      </div>
      {/* Today line */}
      <div className="relative">
        <div className="absolute left-[38%] top-0 h-full w-px bg-primary/40 z-10" />
        <div className="flex flex-col gap-2">
          {bars.map((bar) => (
            <div key={bar.label} className="relative h-7 rounded bg-muted/30">
              <div
                className={`absolute top-1 h-5 rounded ${bar.color} flex items-center px-2`}
                style={{ left: bar.left, width: bar.width }}
              >
                <span className="truncate text-[9px] font-medium text-foreground/80">{bar.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsPreview() {
  const bars = [32, 48, 28, 56, 44, 60];
  const labels = ["S1", "S2", "S3", "S4", "S5", "S6"];
  return (
    <div className="p-4">
      <p className="mb-3 text-[11px] font-semibold text-foreground">Velocity (story points)</p>
      <div className="flex h-28 items-end gap-2">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
              style={{ height: `${h}%`, originY: 1 }}
              className="w-full rounded-t-lg bg-primary/70"
            />
            <span className="text-[9px] text-muted-foreground">{labels[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Avg velocity", value: "45 pts" },
          { label: "Completed", value: "12 sprints" },
          { label: "Issues closed", value: "284" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-background p-2 text-center">
            <p className="text-sm font-bold text-foreground">{stat.value}</p>
            <p className="text-[9px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimePreview() {
  const members = [
    { name: "Alex K.", hours: 24, issues: 8 },
    { name: "Sam R.", hours: 18, issues: 6 },
    { name: "Jordan L.", hours: 31, issues: 11 },
    { name: "Casey M.", hours: 12, issues: 4 },
  ];
  return (
    <div className="p-4">
      <p className="mb-3 text-[11px] font-semibold text-foreground">Time logged this sprint</p>
      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
              {m.name[0]}
            </div>
            <span className="flex-1 text-[11px] font-medium text-foreground">{m.name}</span>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{m.hours}h logged</span>
              <span>{m.issues} issues</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];

  return (
    <section id="product" className="px-6 py-16 lg:py-16">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Product
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            One platform, every view
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Switch between views without losing context. Your data, your way.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col gap-6 lg:flex-row lg:gap-10"
        >
          {/* Tab list */}
          <div className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
            {TABS.map((t, i) => {
              const Icon = t.icon;
              const isActive = i === activeTab;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(i)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-left transition-all lg:w-full ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="text-sm font-medium">{t.label}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto hidden size-3.5 lg:block" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Preview panel */}
          <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl shadow-black/5">
            {/* Panel header */}
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-3">
              <span className="size-2.5 rounded-full bg-red-400/60" />
              <span className="size-2.5 rounded-full bg-yellow-400/60" />
              <span className="size-2.5 rounded-full bg-emerald-400/60" />
              <span className="ml-3 text-sm text-muted-foreground">
                {tab.label} — TRX Project
              </span>
            </div>

            {/* Animated content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="min-h-[280px] overflow-x-auto"
              >
                {tab.preview}
              </motion.div>
            </AnimatePresence>

            {/* Description bar */}
            <div className="border-t border-border bg-muted/20 px-4 py-3">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm text-muted-foreground"
                >
                  {tab.description}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
