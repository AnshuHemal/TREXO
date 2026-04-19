"use client";

import { useState, useTransition, useMemo } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragStartEvent, type DragEndEvent,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Users, Target, Search, X, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Circle, Layers, ArrowRight,
  CalendarDays, Filter, RotateCcw, Plus,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getPriorityConfig, getTypeConfig, ISSUE_PRIORITIES } from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { addIssueToSprint, removeIssueFromSprint } from "../../sprints/actions";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlanningIssue {
  id: string; key: number; title: string;
  type: string; status: string; priority: string;
  estimate: number | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  epicTitle: string | null;
}

export interface PlanningSprint {
  id: string; name: string; goal: string | null;
  status: string; startDate: Date | null; endDate: Date | null;
  issues: PlanningIssue[];
}

interface Member { id: string; name: string; image: string | null }

interface SprintPlanningClientProps {
  project: { id: string; name: string; key: string };
  workspaceSlug: string;
  backlogIssues: PlanningIssue[];
  sprints: PlanningSprint[];
  members: Member[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Default capacity per member per sprint (story points)
const DEFAULT_CAPACITY_PER_MEMBER = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

function totalPoints(issues: PlanningIssue[]) {
  return issues.reduce((s, i) => s + (i.estimate ?? 0), 0);
}

function unestimatedCount(issues: PlanningIssue[]) {
  return issues.filter((i) => i.estimate == null).length;
}

// ─── Capacity bar ─────────────────────────────────────────────────────────────

function CapacityBar({
  used, capacity, label,
}: { used: number; capacity: number; label?: string }) {
  const pct = capacity > 0 ? Math.min((used / capacity) * 100, 100) : 0;
  const over = used > capacity;
  const warn = !over && pct >= 80;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn(
            "font-semibold tabular-nums",
            over ? "text-destructive" : warn ? "text-amber-500" : "text-foreground",
          )}>
            {used}/{capacity} pts
          </span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className={cn(
            "h-full rounded-full transition-colors",
            over ? "bg-destructive" : warn ? "bg-amber-500" : "bg-primary",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Draggable issue card ─────────────────────────────────────────────────────

function DraggableIssueCard({
  issue, projectKey, isDragging, compact,
}: {
  issue: PlanningIssue; projectKey: string;
  isDragging?: boolean; compact?: boolean;
}) {
  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;

  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 transition-all",
      isDragging
        ? "rotate-1 border-primary/40 shadow-xl ring-2 ring-primary/20"
        : "border-border hover:border-primary/30 hover:bg-accent/20",
      compact && "py-2",
    )}>
      <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
      <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
      <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">
        {projectKey}-{issue.key}
      </span>
      <span className="flex-1 truncate text-sm font-medium text-foreground">
        {issue.title}
      </span>
      {issue.epicTitle && (
        <span className="hidden shrink-0 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 sm:block">
          {issue.epicTitle}
        </span>
      )}
      {issue.estimate != null ? (
        <span className="flex shrink-0 items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
          <Zap className="size-2.5" />{issue.estimate}
        </span>
      ) : (
        <span className="shrink-0 rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground/50">
          —
        </span>
      )}
      {issue.assignee ? (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={issue.assignee.image ?? undefined} />
          <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-5 shrink-0 rounded-full border border-dashed border-border" />
      )}
    </div>
  );
}

// ─── Draggable wrapper ────────────────────────────────────────────────────────

function DraggableCard({
  issue, projectKey, compact,
}: {
  issue: PlanningIssue; projectKey: string; compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    data: { issue },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <DraggableIssueCard issue={issue} projectKey={projectKey} compact={compact} />
    </div>
  );
}

// ─── Droppable zone ───────────────────────────────────────────────────────────

function DroppableZone({
  id, children, className,
}: {
  id: string; children: React.ReactNode; className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] rounded-xl transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SprintPlanningClient({
  project, workspaceSlug, backlogIssues: initialBacklog,
  sprints: initialSprints, members,
}: SprintPlanningClientProps) {
  const [backlog, setBacklog]   = useState(initialBacklog);
  const [sprints, setSprints]   = useState(initialSprints);
  const [dragging, setDragging] = useState<PlanningIssue | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showUnestimated, setShowUnestimated] = useState(false);

  // ── Capacity settings ─────────────────────────────────────────────────────
  const [capacityPerMember, setCapacityPerMember] = useState(DEFAULT_CAPACITY_PER_MEMBER);
  const [selectedSprintId, setSelectedSprintId]   = useState<string>(
    initialSprints.find((s) => s.status === "ACTIVE")?.id ??
    initialSprints.find((s) => s.status === "PLANNED")?.id ?? "",
  );

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId) ?? null;
  const totalCapacity  = members.length * capacityPerMember;
  const sprintPoints   = selectedSprint ? totalPoints(selectedSprint.issues) : 0;

  // ── Filtered backlog ──────────────────────────────────────────────────────
  const filteredBacklog = useMemo(() => {
    let result = backlog;
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      `${project.key}-${i.key}`.toLowerCase().includes(q),
    );
    if (filterPriority !== "all") result = result.filter((i) => i.priority === filterPriority);
    if (filterAssignee === "unassigned") result = result.filter((i) => !i.assigneeId);
    else if (filterAssignee !== "all") result = result.filter((i) => i.assigneeId === filterAssignee);
    if (showUnestimated) result = result.filter((i) => i.estimate == null);
    return result;
  }, [backlog, search, filterPriority, filterAssignee, showUnestimated, project.key]);

  const hasFilters = search || filterPriority !== "all" || filterAssignee !== "all" || showUnestimated;

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    const issue = active.data.current?.issue as PlanningIssue;
    setDragging(issue ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over) return;

    const issue = active.data.current?.issue as PlanningIssue;
    if (!issue) return;

    const overId = over.id as string;

    // Dropped on backlog
    if (overId === "backlog") {
      // Only move if it's currently in a sprint
      const inSprint = sprints.some((s) => s.issues.some((i) => i.id === issue.id));
      if (!inSprint) return;

      // Optimistic update
      setSprints((prev) => prev.map((s) => ({
        ...s, issues: s.issues.filter((i) => i.id !== issue.id),
      })));
      setBacklog((prev) => [issue, ...prev]);

      startTransition(async () => {
        const result = await removeIssueFromSprint(issue.id);
        if (!result.success) {
          // Revert
          setBacklog((prev) => prev.filter((i) => i.id !== issue.id));
          setSprints((prev) => prev.map((s) =>
            s.id === selectedSprintId
              ? { ...s, issues: [...s.issues, issue] }
              : s,
          ));
        }
      });
      return;
    }

    // Dropped on a sprint
    const targetSprintId = overId.startsWith("sprint-") ? overId.slice(7) : null;
    if (!targetSprintId) return;

    const alreadyInSprint = sprints
      .find((s) => s.id === targetSprintId)
      ?.issues.some((i) => i.id === issue.id);
    if (alreadyInSprint) return;

    // Remove from backlog or other sprint
    setBacklog((prev) => prev.filter((i) => i.id !== issue.id));
    setSprints((prev) => prev.map((s) => ({
      ...s,
      issues: s.id === targetSprintId
        ? [...s.issues, issue]
        : s.issues.filter((i) => i.id !== issue.id),
    })));

    startTransition(async () => {
      const result = await addIssueToSprint(issue.id, targetSprintId);
      if (!result.success) {
        // Revert
        setSprints((prev) => prev.map((s) => ({
          ...s, issues: s.issues.filter((i) => i.id !== issue.id),
        })));
        setBacklog((prev) => [issue, ...prev]);
      }
    });
  }

  // ── Quick move buttons (no drag) ──────────────────────────────────────────
  function moveToSprint(issue: PlanningIssue, sprintId: string) {
    setBacklog((prev) => prev.filter((i) => i.id !== issue.id));
    setSprints((prev) => prev.map((s) =>
      s.id === sprintId ? { ...s, issues: [...s.issues, issue] } : s,
    ));
    startTransition(async () => {
      const r = await addIssueToSprint(issue.id, sprintId);
      if (!r.success) {
        setBacklog((prev) => [issue, ...prev]);
        setSprints((prev) => prev.map((s) =>
          s.id === sprintId ? { ...s, issues: s.issues.filter((i) => i.id !== issue.id) } : s,
        ));
      }
    });
  }

  function moveToBacklog(issue: PlanningIssue, fromSprintId: string) {
    setSprints((prev) => prev.map((s) =>
      s.id === fromSprintId ? { ...s, issues: s.issues.filter((i) => i.id !== issue.id) } : s,
    ));
    setBacklog((prev) => [issue, ...prev]);
    startTransition(async () => {
      const r = await removeIssueFromSprint(issue.id);
      if (!r.success) {
        setBacklog((prev) => prev.filter((i) => i.id !== issue.id));
        setSprints((prev) => prev.map((s) =>
          s.id === fromSprintId ? { ...s, issues: [...s.issues, issue] } : s,
        ));
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Toolbar ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div>
            <h1 className="text-base font-bold text-foreground">Sprint Planning</h1>
            <p className="text-xs text-muted-foreground">
              Drag issues from the backlog into a sprint. Set capacity to track load.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sprint selector */}
            {sprints.length > 0 && (
              <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                <SelectTrigger className="h-8 w-48 text-xs">
                  <SelectValue placeholder="Select sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2 text-xs">
                        <span className={cn(
                          "size-1.5 rounded-full",
                          s.status === "ACTIVE" ? "bg-primary" : "bg-muted-foreground",
                        )} />
                        {s.name}
                        {s.status === "ACTIVE" && (
                          <span className="text-[10px] text-primary">Active</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Capacity per member */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Capacity/member:</span>
              <input
                type="number"
                min={1}
                max={200}
                value={capacityPerMember}
                onChange={(e) => setCapacityPerMember(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 bg-transparent text-center text-xs font-semibold text-foreground focus:outline-none"
              />
              <span className="text-xs text-muted-foreground">pts</span>
            </div>
          </div>
        </div>

        {/* ── Split layout ──────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Backlog ─────────────────────────────────────────────── */}
          <div className="flex w-[48%] shrink-0 flex-col border-r border-border">

            {/* Backlog header */}
            <div className="border-b border-border bg-muted/20 px-4 py-3">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Backlog</span>
                  <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {filteredBacklog.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="size-3 text-primary" />
                    {totalPoints(filteredBacklog)} pts
                  </span>
                  {unestimatedCount(filteredBacklog) > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="size-3" />
                      {unestimatedCount(filteredBacklog)} unestimated
                    </span>
                  )}
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-32">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-7 pl-8 text-xs"
                  />
                  {search && (
                    <button onClick={() => setSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className={cn("h-7 w-28 text-xs", filterPriority !== "all" && "border-primary text-primary")}>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2 text-xs">
                          <Icon className={cn("size-3.5", color)} />{label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() => setShowUnestimated((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    showUnestimated
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  <AlertTriangle className="size-3" />
                  Unestimated
                </button>

                {hasFilters && (
                  <button
                    onClick={() => { setSearch(""); setFilterPriority("all"); setFilterAssignee("all"); setShowUnestimated(false); }}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3" />Clear
                  </button>
                )}
              </div>
            </div>

            {/* Backlog drop zone + list */}
            <DroppableZone id="backlog" className="flex-1 overflow-y-auto p-3">
              {filteredBacklog.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <CheckCircle2 className="size-8 text-emerald-500/40" />
                  <p className="text-sm font-medium text-foreground">
                    {hasFilters ? "No issues match filters" : "Backlog is empty"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasFilters ? "Try clearing filters" : "All issues are in sprints"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence initial={false}>
                    {filteredBacklog.map((issue, i) => (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.3) }}
                        className="group relative"
                      >
                        <DraggableCard issue={issue} projectKey={project.key} />
                        {/* Quick-add button */}
                        {selectedSprint && (
                          <button
                            type="button"
                            onClick={() => moveToSprint(issue, selectedSprint.id)}
                            disabled={isPending}
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-primary/20 disabled:opacity-50"
                          >
                            <ArrowRight className="size-2.5" />
                            Add
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </DroppableZone>
          </div>

          {/* ── RIGHT: Sprint ─────────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {sprints.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
                  <Target className="size-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">No active or planned sprints</p>
                <p className="text-xs text-muted-foreground">Create a sprint first to start planning.</p>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/workspace/${workspaceSlug}/projects/${project.key}/sprints`}>
                    <Plus className="mr-1.5 size-3.5" />Go to Sprints
                  </a>
                </Button>
              </div>
            ) : !selectedSprint ? (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a sprint above</p>
              </div>
            ) : (
              <>
                {/* Sprint header */}
                <div className="border-b border-border bg-muted/20 px-4 py-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          selectedSprint.status === "ACTIVE"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}>
                          <Circle className="size-1.5 fill-current" />
                          {selectedSprint.status === "ACTIVE" ? "Active" : "Planned"}
                        </span>
                        <h2 className="truncate text-sm font-bold text-foreground">
                          {selectedSprint.name}
                        </h2>
                      </div>
                      {selectedSprint.goal && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {selectedSprint.goal}
                        </p>
                      )}
                      {(selectedSprint.startDate || selectedSprint.endDate) && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {formatDate(selectedSprint.startDate)} – {formatDate(selectedSprint.endDate) ?? "No end date"}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="size-3.5" />
                        <strong className="text-foreground">{selectedSprint.issues.length}</strong> issues
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="size-3.5 text-primary" />
                        <strong className="text-foreground">{sprintPoints}</strong> pts
                      </span>
                    </div>
                  </div>

                  {/* Capacity bars */}
                  <div className="flex flex-col gap-2">
                    <CapacityBar
                      used={sprintPoints}
                      capacity={totalCapacity}
                      label={`Team capacity (${members.length} members × ${capacityPerMember} pts)`}
                    />
                    {/* Per-member breakdown */}
                    {members.length > 0 && members.length <= 8 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1">
                        {members.map((m) => {
                          const memberPts = selectedSprint.issues
                            .filter((i) => i.assigneeId === m.id)
                            .reduce((s, i) => s + (i.estimate ?? 0), 0);
                          return (
                            <div key={m.id} className="flex items-center gap-2">
                              <Avatar className="size-4 shrink-0">
                                <AvatarImage src={m.image ?? undefined} />
                                <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="truncate text-[10px] text-muted-foreground">{m.name}</span>
                                  <span className={cn(
                                    "text-[10px] font-semibold tabular-nums",
                                    memberPts > capacityPerMember ? "text-destructive" : "text-foreground",
                                  )}>
                                    {memberPts}/{capacityPerMember}
                                  </span>
                                </div>
                                <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-border">
                                  <motion.div
                                    className={cn(
                                      "h-full rounded-full",
                                      memberPts > capacityPerMember ? "bg-destructive" : "bg-primary",
                                    )}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min((memberPts / capacityPerMember) * 100, 100)}%` }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Unestimated warning */}
                    {unestimatedCount(selectedSprint.issues) > 0 && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        {unestimatedCount(selectedSprint.issues)} issue{unestimatedCount(selectedSprint.issues) !== 1 ? "s" : ""} without estimates — capacity may be understated
                      </div>
                    )}
                  </div>
                </div>

                {/* Sprint drop zone + issues */}
                <DroppableZone id={`sprint-${selectedSprint.id}`} className="flex-1 overflow-y-auto p-3">
                  {selectedSprint.issues.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <Target className="size-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-foreground">Drop issues here</p>
                      <p className="text-xs text-muted-foreground">
                        Drag from the backlog or click the → button
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <AnimatePresence initial={false}>
                        {selectedSprint.issues.map((issue, i) => (
                          <motion.div
                            key={issue.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.3) }}
                            className="group relative"
                          >
                            <DraggableCard issue={issue} projectKey={project.key} />
                            {/* Quick-remove button */}
                            <button
                              type="button"
                              onClick={() => moveToBacklog(issue, selectedSprint.id)}
                              disabled={isPending}
                              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
                              title="Remove from sprint"
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </DroppableZone>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {dragging && (
          <DraggableIssueCard issue={dragging} projectKey={project.key} isDragging />
        )}
      </DragOverlay>
    </DndContext>
  );
}
