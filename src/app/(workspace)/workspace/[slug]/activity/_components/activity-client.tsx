"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Clock,
  ArrowRight,
  GitCommitHorizontal,
  UserCheck,
  MessageSquare,
  ArrowRightLeft,
  Tag,
  Zap,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatActivityType, formatActivityValue } from "@/lib/issue-config";
import { FadeIn } from "@/components/motion/fade-in";

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
    project: { id: string; key: string; name: string };
  } | null;
}

interface Member {
  id: string;
  name: string;
  image: string | null;
}

interface Project {
  id: string;
  name: string;
  key: string;
}

interface ActivityClientProps {
  activities: ActivityEntry[];
  members: Member[];
  projects: Project[];
  workspaceSlug: string;
  isAdminOrOwner: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  activeActorId: string | null;
  activeProjectId: string | null;
  activeType: string | null;
  activeFrom: string | null;
  activeTo: string | null;
}

// ─── Activity type config ─────────────────────────────────────────────────────

const ACTIVITY_TYPES = [
  { value: "issue_created",    label: "Issue created",    icon: GitCommitHorizontal, color: "text-emerald-500" },
  { value: "status_changed",   label: "Status changed",   icon: ArrowRightLeft,      color: "text-blue-500"    },
  { value: "priority_changed", label: "Priority changed", icon: Zap,                 color: "text-amber-500"   },
  { value: "assignee_changed", label: "Assignee changed", icon: UserCheck,           color: "text-purple-500"  },
  { value: "comment_added",    label: "Comment added",    icon: MessageSquare,       color: "text-primary"     },
  { value: "label_added",      label: "Label added",      icon: Tag,                 color: "text-pink-500"    },
  { value: "label_removed",    label: "Label removed",    icon: Tag,                 color: "text-muted-foreground" },
] as const;

function getActivityIcon(type: string) {
  const found = ACTIVITY_TYPES.find((t) => t.value === type);
  if (found) return { Icon: found.icon, color: found.color };
  return { Icon: AlertCircle, color: "text-muted-foreground" };
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
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatAbsolute(date: Date): string {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Activity row ─────────────────────────────────────────────────────────────

function ActivityRow({
  entry,
  index,
  workspaceSlug,
}: {
  entry: ActivityEntry;
  index: number;
  workspaceSlug: string;
}) {
  const { Icon, color } = getActivityIcon(entry.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.4), ease: [0.25, 0.1, 0.25, 1] }}
      className="group flex items-start gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/20 hover:bg-accent/20"
    >
      {/* Actor avatar */}
      <Avatar className="mt-0.5 size-8 shrink-0 ring-2 ring-background">
        <AvatarImage src={entry.actor.image ?? undefined} />
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(entry.actor.name)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        {/* Main line */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="font-semibold text-foreground">{entry.actor.name}</span>

          {/* Activity type icon + label */}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Icon className={cn("size-3.5 shrink-0", color)} />
            {formatActivityType(entry.type)}
          </span>

          {/* From → To values */}
          {entry.fromValue && entry.toValue && (
            <span className="flex items-center gap-1">
              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {formatActivityValue(entry.fromValue)}
              </span>
              <ArrowRight className="size-3 text-muted-foreground/50" />
              <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                {formatActivityValue(entry.toValue)}
              </span>
            </span>
          )}

          {/* Only toValue (e.g. issue_created) */}
          {!entry.fromValue && entry.toValue && (
            <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary">
              {formatActivityValue(entry.toValue)}
            </span>
          )}
        </div>

        {/* Issue reference */}
        {entry.issue && (
          <a
            href={`/workspace/${workspaceSlug}/projects/${entry.issue.project.key}/backlog`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            <div className="flex size-4 shrink-0 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
              {entry.issue.project.key.charAt(0)}
            </div>
            <span className="font-mono text-muted-foreground/70">
              {entry.issue.project.key}-{entry.issue.key}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate max-w-xs">{entry.issue.title}</span>
          </a>
        )}
      </div>

      {/* Timestamp */}
      <div
        className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground/60"
        title={formatAbsolute(entry.createdAt)}
      >
        <Clock className="size-3" />
        {formatRelative(entry.createdAt)}
      </div>
    </motion.div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({
  members,
  projects,
  activeActorId,
  activeProjectId,
  activeType,
  activeFrom,
  activeTo,
  onFilter,
  onClear,
  hasActiveFilters,
}: {
  members: Member[];
  projects: Project[];
  activeActorId: string | null;
  activeProjectId: string | null;
  activeType: string | null;
  activeFrom: string | null;
  activeTo: string | null;
  onFilter: (key: string, value: string | null) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <FadeIn delay={0.05}>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Filter className="size-3.5" />
            Filters
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Actor filter */}
          <Select
            value={activeActorId ?? "all"}
            onValueChange={(v) => onFilter("actor", v === "all" ? null : v)}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-40 text-xs",
                activeActorId && "border-primary text-primary",
              )}
            >
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 text-xs">
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

          {/* Project filter */}
          <Select
            value={activeProjectId ?? "all"}
            onValueChange={(v) => onFilter("project", v === "all" ? null : v)}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-40 text-xs",
                activeProjectId && "border-primary text-primary",
              )}
            >
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2 text-xs">
                    <div className="flex size-4 shrink-0 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                      {p.key.charAt(0)}
                    </div>
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Activity type filter */}
          <Select
            value={activeType ?? "all"}
            onValueChange={(v) => onFilter("type", v === "all" ? null : v)}
          >
            <SelectTrigger
              className={cn(
                "h-8 w-44 text-xs",
                activeType && "border-primary text-primary",
              )}
            >
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {ACTIVITY_TYPES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2 text-xs">
                    <Icon className={cn("size-3.5", color)} />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={activeFrom ?? ""}
              onChange={(e) => onFilter("from", e.target.value || null)}
              className={cn(
                "h-8 w-36 text-xs",
                activeFrom && "border-primary text-primary",
              )}
              placeholder="From"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="date"
              value={activeTo ?? ""}
              onChange={(e) => onFilter("to", e.target.value || null)}
              className={cn(
                "h-8 w-36 text-xs",
                activeTo && "border-primary text-primary",
              )}
              placeholder="To"
            />
          </div>

          {/* Clear */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={onClear}
                >
                  <RotateCcw className="size-3.5" />
                  Clear filters
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active filter chips */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 flex flex-wrap gap-1.5 overflow-hidden"
            >
              {activeActorId && (
                <FilterChip
                  label={`Member: ${members.find((m) => m.id === activeActorId)?.name ?? activeActorId}`}
                  onRemove={() => onFilter("actor", null)}
                />
              )}
              {activeProjectId && (
                <FilterChip
                  label={`Project: ${projects.find((p) => p.id === activeProjectId)?.name ?? activeProjectId}`}
                  onRemove={() => onFilter("project", null)}
                />
              )}
              {activeType && (
                <FilterChip
                  label={`Action: ${ACTIVITY_TYPES.find((t) => t.value === activeType)?.label ?? activeType}`}
                  onRemove={() => onFilter("type", null)}
                />
              )}
              {activeFrom && (
                <FilterChip
                  label={`From: ${activeFrom}`}
                  onRemove={() => onFilter("from", null)}
                />
              )}
              {activeTo && (
                <FilterChip
                  label={`To: ${activeTo}`}
                  onRemove={() => onFilter("to", null)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FadeIn>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-medium text-primary"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-primary/10 transition-colors"
        aria-label="Remove filter"
      >
        <X className="size-2.5" />
      </button>
    </motion.span>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, totalCount);

  if (totalPages <= 1) return null;

  // Build page numbers to show (window of 5 around current)
  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("…");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <FadeIn delay={0.1}>
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-3">
        <span className="text-xs text-muted-foreground">
          Showing {start.toLocaleString()}–{end.toLocaleString()} of {totalCount.toLocaleString()} events
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={currentPage <= 1}
            onClick={() => onPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === currentPage ? "default" : "outline"}
                size="icon"
                className="size-8 text-xs"
                onClick={() => onPage(p as number)}
                aria-label={`Page ${p}`}
                aria-current={p === currentPage ? "page" : undefined}
              >
                {p}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={currentPage >= totalPages}
            onClick={() => onPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </FadeIn>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ActivityClient({
  activities,
  members,
  projects,
  workspaceSlug,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  activeActorId,
  activeProjectId,
  activeType,
  activeFrom,
  activeTo,
}: ActivityClientProps) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const hasActiveFilters = !!(activeActorId || activeProjectId || activeType || activeFrom || activeTo);

  // ── URL-based navigation ──────────────────────────────────────────────────────

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Reset to page 1 when filters change
      if (!("page" in updates)) params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  function handleFilter(key: string, value: string | null) {
    navigate({ [key]: value });
  }

  function handleClear() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  function handlePage(page: number) {
    navigate({ page: String(page) });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <FilterBar
        members={members}
        projects={projects}
        activeActorId={activeActorId}
        activeProjectId={activeProjectId}
        activeType={activeType}
        activeFrom={activeFrom}
        activeTo={activeTo}
        onFilter={handleFilter}
        onClear={handleClear}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Activity list */}
      {activities.length === 0 ? (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60">
              <Activity className="size-8 text-muted-foreground/40" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              No activity found
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No events match your current filters. Try adjusting them."
                : "Activity will appear here as your team makes changes."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={handleClear}
              >
                <RotateCcw className="size-3.5" />
                Clear filters
              </Button>
            )}
          </div>
        </FadeIn>
      ) : (
        <FadeIn delay={0.08}>
          <div className="flex flex-col gap-2">
            {activities.map((entry, i) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                index={i}
                workspaceSlug={workspaceSlug}
              />
            ))}
          </div>
        </FadeIn>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPage={handlePage}
      />
    </div>
  );
}
