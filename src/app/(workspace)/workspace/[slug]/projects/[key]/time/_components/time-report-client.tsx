"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Clock, Users, Filter, X, CalendarDays, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatMinutes } from "@/lib/time-utils";
import { fadeUpVariants, StaggerChildren } from "@/components/motion/fade-in";

interface TimeLogEntry {
  id: string;
  minutes: number;
  loggedAt: Date;
  description: string | null;
  user: { id: string; name: string; image: string | null };
  issue: { id: string; key: number; title: string; status: string; estimate: number | null };
}

interface Member {
  id: string;
  name: string;
  image: string | null;
}

interface TimeReportClientProps {
  logs: TimeLogEntry[];
  members: Member[];
  projectKey: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function StatCard({ label, value, icon: Icon, sub }: {
  label: string; value: string; icon: React.ElementType; sub?: string;
}) {
  return (
    <motion.div variants={fadeUpVariants} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

export function TimeReportClient({ logs, members, projectKey }: TimeReportClientProps) {
  const [filterMember, setFilterMember] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterNow] = useState(() => Date.now());

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterMember !== "all" && l.user.id !== filterMember) return false;
      if (filterPeriod === "7d" && filterNow - new Date(l.loggedAt).getTime() > 7 * 86400000) return false;
      if (filterPeriod === "30d" && filterNow - new Date(l.loggedAt).getTime() > 30 * 86400000) return false;
      return true;
    });
  }, [logs, filterMember, filterPeriod, filterNow]);

  const totalMinutes = filtered.reduce((s, l) => s + l.minutes, 0);
  const uniqueIssues = new Set(filtered.map((l) => l.issue.id)).size;
  const uniqueMembers = new Set(filtered.map((l) => l.user.id)).size;

  const byMember = useMemo(() => {
    const map = new Map<string, { user: Member; minutes: number; count: number }>();
    for (const l of filtered) {
      const existing = map.get(l.user.id);
      if (existing) {
        existing.minutes += l.minutes;
        existing.count++;
      } else {
        map.set(l.user.id, { user: l.user, minutes: l.minutes, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const hasFilters = filterMember !== "all" || filterPeriod !== "all";

  return (
    <div className="flex flex-col gap-6">
      {}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="size-3.5 shrink-0 text-muted-foreground" />

        <Select value={filterMember} onValueChange={setFilterMember}>
          <SelectTrigger className={cn("h-8 w-auto min-w-[9rem] text-sm", filterMember !== "all" && "border-primary text-primary")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All members</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <span className="flex items-center gap-2 text-sm">
                  <Avatar className="size-4">
                    <AvatarImage src={m.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                  </Avatar>
                  {m.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className={cn("h-8 w-auto min-w-[8rem] text-sm", filterPeriod !== "all" && "border-primary text-primary")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-sm text-muted-foreground"
            onClick={() => { setFilterMember("all"); setFilterPeriod("all"); }}>
            <X className="size-3.5" />Clear
          </Button>
        )}
      </div>

      {}
      <StaggerChildren className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total logged"   value={formatMinutes(totalMinutes)} icon={Clock}  sub={`${filtered.length} entries`} />
        <StatCard label="Issues tracked" value={String(uniqueIssues)}        icon={Timer}  sub="unique issues" />
        <StatCard label="Contributors"   value={String(uniqueMembers)}       icon={Users}  sub="team members" />
      </StaggerChildren>

      {}
      {byMember.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">By team member</p>
          </div>
          <div className="divide-y divide-border">
            {byMember.map(({ user, minutes, count }) => {
              const pct = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
              return (
                <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-[10px] font-semibold">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
                      <span className="shrink-0 text-sm font-semibold text-foreground">{formatMinutes(minutes)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{count} {count === 1 ? "entry" : "entries"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-sm font-semibold text-foreground">
            All entries
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Clock className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No time logged yet.</p>
            <p className="text-sm text-muted-foreground/60">
              Open any issue and click the + next to &ldquo;Time tracking&rdquo; to log time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((log, i) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="size-6 shrink-0">
                  <AvatarImage src={log.user.image ?? undefined} />
                  <AvatarFallback className="text-[9px] font-semibold">{getInitials(log.user.name)}</AvatarFallback>
                </Avatar>

                <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground shrink-0">
                      {projectKey}-{log.issue.key}
                    </span>
                    <span className="truncate text-sm text-foreground">{log.issue.title}</span>
                  </div>
                  {log.description && (
                    <p className="truncate text-sm text-muted-foreground">{log.description}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" />
                    {formatDate(log.loggedAt)}
                  </span>
                  <span className="font-semibold text-foreground">{formatMinutes(log.minutes)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
