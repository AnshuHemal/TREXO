"use client";

import { motion } from "motion/react";
import {
  Kanban,
  Zap,
  Timer,
  Settings2,
  Search,
  Bell,
  GitBranch,
  BarChart3,
  Users,
  Shield,
  FileText,
  Layers,
} from "lucide-react";

// ─── Feature data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Kanban,
    title: "Kanban Board",
    description:
      "Drag-and-drop columns with swimlanes, WIP limits, epic badges, and priority color coding.",
  },
  {
    icon: Zap,
    title: "Sprint Planning",
    description:
      "Capacity planning with story points, velocity charts, and burndown tracking across sprints.",
  },
  {
    icon: Timer,
    title: "Time Tracking",
    description:
      "Log time per issue, view team-wide time reports, and keep estimates accurate.",
  },
  {
    icon: Settings2,
    title: "Custom Workflows",
    description:
      "Define per-project statuses, reorder them, and control which transitions are allowed.",
  },
  {
    icon: Search,
    title: "Global Search",
    description:
      "Cmd+K palette searches issues and projects instantly across your entire workspace.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Get notified on assignments, mentions, status changes, and comments — with per-type controls.",
  },
  {
    icon: GitBranch,
    title: "Issue Linking",
    description:
      "Link issues as Blocks, Blocked By, Duplicates, or Relates To — keep dependencies visible.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Health",
    description:
      "Status distribution charts, velocity trends, overdue indicators, and project health scores.",
  },
  {
    icon: Users,
    title: "Team Workload",
    description:
      "See open issue counts, story point totals, and overdue work per team member at a glance.",
  },
  {
    icon: Shield,
    title: "Access Control",
    description:
      "Public and private projects with per-project roles: Lead, Member, and Viewer.",
  },
  {
    icon: FileText,
    title: "Issue Templates",
    description:
      "Create reusable templates with preset type, priority, and description to speed up issue creation.",
  },
  {
    icon: Layers,
    title: "Roadmap View",
    description:
      "Horizontal timeline with draggable sprint and epic bars, today line, and progress fill.",
  },
];

// ─── Variants ─────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FeaturesGrid() {
  return (
    <section id="features" className="px-6 py-24 lg:py-32">
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
            Features
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything your team needs
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Built for how modern teams actually work — not how enterprise software
            thinks they should.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5"
              >
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="size-5 text-primary" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
