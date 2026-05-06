"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Clock, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatActivityType, formatActivityValue } from "@/lib/issue-config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: { id: string; name: string; image: string | null };
  issue: {
    id: string;
    key: number;
    title: string;
    project: { key: string; name: string };
  } | null;
}

interface ActivityFeedFullProps {
  activities: ActivityItem[];
  workspaceSlug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelative(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric",
  }).format(new Date(date));
}

// Group activities by day
function groupByDay(activities: ActivityItem[]) {
  const groups = new Map<string, ActivityItem[]>();
  for (const a of activities) {
    const key = new Date(a.createdAt).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  return Array.from(groups.entries()).map(([key, items]) => ({
    label: key === new Date().toDateString() ? "Today"
      : key === new Date(Date.now() - 86400000).toDateString() ? "Yesterday"
      : formatDate(new Date(key)),
    items,
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export function ActivityFeedFull({ activities, workspaceSlug }: ActivityFeedFullProps) {
  const [shown, setShown] = useState(PAGE_SIZE);
  const visible = activities.slice(0, shown);
  const groups  = groupByDay(visible);

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <Clock className="size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ label, items }) => (
        <div key={label}>
          {/* Day label */}
          <div className="mb-3 flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Activity items */}
          <div className="flex flex-col gap-1">
            {items.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: i * 0.02 }}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors"
              >
                {/* Actor avatar */}
                <Avatar className="mt-0.5 size-7 shrink-0">
                  <AvatarImage src={a.actor.image ?? undefined} />
                  <AvatarFallback className="text-[10px] font-semibold">
                    {getInitials(a.actor.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex flex-1 flex-wrap items-baseline gap-1 min-w-0">
                  <span className="text-sm font-semibold text-foreground">{a.actor.name}</span>
                  <span className="text-sm text-muted-foreground">{formatActivityType(a.type)}</span>

                  {a.fromValue && a.toValue && (
                    <>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {formatActivityValue(a.fromValue)}
                      </span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {formatActivityValue(a.toValue)}
                      </span>
                    </>
                  )}

                  {a.issue && (
                    <span className="text-sm text-muted-foreground">
                      on{" "}
                      <span className="font-mono text-xs text-foreground">
                        {a.issue.project.key}-{a.issue.key}
                      </span>
                      {" "}
                      <span className="truncate text-foreground">{a.issue.title}</span>
                    </span>
                  )}
                </div>

                {/* Time */}
                <span className="shrink-0 text-[11px] text-muted-foreground/60">
                  {formatRelative(a.createdAt)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Load more */}
      {shown < activities.length && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShown((v) => v + PAGE_SIZE)}
          >
            Load more ({activities.length - shown} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
