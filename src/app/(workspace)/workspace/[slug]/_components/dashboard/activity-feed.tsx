"use client";

import { motion } from "motion/react";
import { Activity, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FadeIn } from "@/components/motion/fade-in";
import { formatActivityType, formatActivityValue } from "@/lib/issue-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityEntry {
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
    project: { key: string };
  } | null;
}

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <FadeIn delay={0.25}>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="size-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="flex items-start gap-2.5"
              >
                <Avatar className="mt-0.5 size-6 shrink-0">
                  <AvatarImage src={entry.actor.image ?? undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(entry.actor.name)}</AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{entry.actor.name}</span>
                    <span>{formatActivityType(entry.type)}</span>
                    {entry.fromValue && entry.toValue && (
                      <>
                        <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
                          {formatActivityValue(entry.fromValue)}
                        </span>
                        <span>→</span>
                        <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
                          {formatActivityValue(entry.toValue)}
                        </span>
                      </>
                    )}
                  </div>
                  {entry.issue && (
                    <p className="truncate text-xs text-muted-foreground/70">
                      <span className="font-mono">{entry.issue.project.key}-{entry.issue.key}</span>
                      {" · "}
                      {entry.issue.title}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground/60">
                  <Clock className="size-3" />
                  {formatRelative(entry.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </FadeIn>
  );
}
