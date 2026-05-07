"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

// ─── Fake Kanban board mockup ─────────────────────────────────────────────────

const COLUMNS = [
  {
    label: "Backlog",
    color: "bg-muted-foreground/20",
    cards: [
      { title: "Design system tokens", tag: "DESIGN", priority: "medium" },
      { title: "API rate limiting", tag: "BACKEND", priority: "low" },
    ],
  },
  {
    label: "In Progress",
    color: "bg-primary/20",
    cards: [
      { title: "Kanban drag & drop", tag: "FRONTEND", priority: "high" },
      { title: "Sprint velocity chart", tag: "ANALYTICS", priority: "medium" },
      { title: "Email notifications", tag: "BACKEND", priority: "high" },
    ],
  },
  {
    label: "In Review",
    color: "bg-yellow-500/20",
    cards: [
      { title: "Mobile responsive layout", tag: "FRONTEND", priority: "high" },
      { title: "Custom workflow editor", tag: "SETTINGS", priority: "medium" },
    ],
  },
  {
    label: "Done",
    color: "bg-emerald-500/20",
    cards: [
      { title: "Auth with OTP verification", tag: "AUTH", priority: "urgent" },
      { title: "Workspace invitations", tag: "TEAM", priority: "medium" },
    ],
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
};

function KanbanMockup() {
  return (
    <div className="flex gap-3 min-w-0">
      {COLUMNS.map((col, ci) => (
        <div key={col.label} className="flex w-44 shrink-0 flex-col gap-2">
          {/* Column header */}
          <div className="flex items-center gap-2 px-1">
            <span className={`size-2 rounded-full ${col.color}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {col.label}
            </span>
            <span className="ml-auto text-[10px] text-muted-foreground/60">
              {col.cards.length}
            </span>
          </div>
          {/* Cards */}
          {col.cards.map((card, ki) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + ci * 0.1 + ki * 0.06, duration: 0.3 }}
              className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
            >
              <p className="mb-2 text-[11px] font-medium leading-tight text-foreground line-clamp-2">
                {card.title}
              </p>
              <div className="flex items-center justify-between">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {card.tag}
                </span>
                <span
                  className={`size-1.5 rounded-full ${PRIORITY_COLORS[card.priority]}`}
                  title={card.priority}
                />
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center overflow-hidden px-6 pb-0 pt-24 text-center lg:pt-32"
    >
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-center pt-16"
      >
        <div className="h-[500px] w-[900px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,transparent_30%,var(--background)_100%)]"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm"
        >
          <Sparkles className="size-3.5 text-primary" />
          Modern project management — built for speed
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-2"
        >
          <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Track less.{" "}
            <span className="bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Ship more.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {siteConfig.description}
          </p>
        </motion.div>

        {/* CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" asChild className="min-w-44 gap-2">
            <Link href="/signup">
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="min-w-44">
            <Link href="/login">Log in</Link>
          </Button>
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="text-sm text-muted-foreground"
        >
          No credit card required &middot; Free forever on small teams
        </motion.p>
      </div>

      {/* Product mockup */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateX: 6 }}
        transition={{ duration: 0.7, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ perspective: 1200, transformStyle: "preserve-3d" }}
        className="relative z-10 mt-16 w-full max-w-5xl"
      >
        {/* Glow behind mockup */}
        <div
          aria-hidden
          className="absolute -inset-4 rounded-2xl bg-primary/5 blur-2xl"
        />

        {/* Mockup frame */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/20 ring-1 ring-border/50">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
            <div className="mx-auto flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-1 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/60" />
              trexo-web.vercel.app/workspace/my-team/projects/TRX
            </div>
          </div>

          {/* App shell */}
          <div className="flex h-[340px] sm:h-[400px]">
            {/* Sidebar */}
            <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-border bg-muted/20 p-3 sm:flex">
              <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5">
                <div className="size-5 rounded bg-primary/20" />
                <span className="text-[11px] font-semibold text-foreground">My Team</span>
              </div>
              {["Board", "Backlog", "Sprints", "Roadmap", "Analytics"].map((item, i) => (
                <div
                  key={item}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium ${
                    i === 0
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Board area */}
            <div className="flex-1 overflow-x-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Sprint 4 — Active
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-3/5 rounded-full bg-primary" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">60%</span>
                </div>
              </div>
              <KanbanMockup />
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-background to-transparent"
        />
      </motion.div>
    </section>
  );
}
