"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
  LayoutList,
  Info,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { updateSprintDates } from "../../sprints/actions";
import { getPriorityConfig } from "@/lib/issue-config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoadmapSprint {
  id: string;
  name: string;
  goal: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  startDate: Date | null;
  endDate: Date | null;
  issueCount: number;
  doneCount: number;
}

export interface RoadmapEpic {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  subTaskCount: number;
  doneSubTaskCount: number;
}

interface RoadmapClientProps {
  project: { id: string; name: string; key: string };
  sprints: RoadmapSprint[];
  epics: RoadmapEpic[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_WIDTH = 28; // px per day
const ROW_HEIGHT = 48; // px per row
const LABEL_WIDTH = 220; // px for left label column
const HEADER_HEIGHT = 56; // px for date header

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

function getSprintColor(status: RoadmapSprint["status"]) {
  switch (status) {
    case "ACTIVE":    return { bg: "bg-primary/20", border: "border-primary/60", text: "text-primary", dot: "bg-primary" };
    case "COMPLETED": return { bg: "bg-muted/60",   border: "border-border",     text: "text-muted-foreground", dot: "bg-muted-foreground" };
    default:          return { bg: "bg-blue-500/10", border: "border-blue-500/40", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" };
  }
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    PLANNED: "Planned", ACTIVE: "Active", COMPLETED: "Completed",
    TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review",
    DONE: "Done", CANCELLED: "Cancelled", BACKLOG: "Backlog",
  };
  return map[status] ?? status;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoadmapClient({ project, sprints: initialSprints, epics }: RoadmapClientProps) {
  const [sprints, setSprints] = useState<RoadmapSprint[]>(
    initialSprints.map((s) => ({
      ...s,
      startDate: s.startDate ? new Date(s.startDate) : null,
      endDate:   s.endDate   ? new Date(s.endDate)   : null,
    })),
  );

  const [view, setView] = useState<"sprints" | "epics">("sprints");
  const [tooltip, setTooltip] = useState<{ id: string; x: number; y: number } | null>(null);

  // ── Compute visible date range ─────────────────────────────────────────────
  const today = useMemo(() => startOfDay(new Date()), []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const allDates: Date[] = [addDays(today, -14)];

    for (const s of sprints) {
      if (s.startDate) allDates.push(addDays(new Date(s.startDate), -7));
      if (s.endDate)   allDates.push(addDays(new Date(s.endDate),    7));
    }
    for (const e of epics) {
      if (e.dueDate)   allDates.push(addDays(new Date(e.dueDate),    7));
      allDates.push(addDays(new Date(e.createdAt), -7));
    }

    const start = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const end   = new Date(Math.max(...allDates.map((d) => d.getTime()), addDays(today, 60).getTime()));

    return { rangeStart: startOfDay(start), rangeEnd: startOfDay(end) };
  }, [sprints, epics, today]);

  const days = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const totalWidth = days.length * DAY_WIDTH;

  // ── Scroll to today on mount ───────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayOffset = diffDays(rangeStart, today) * DAY_WIDTH - 120;
    scrollRef.current.scrollLeft = Math.max(0, todayOffset);
  }, [rangeStart, today]);

  // ── Month groups for header ────────────────────────────────────────────────
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIdx: number; count: number }[] = [];
    let cur = "";
    for (let i = 0; i < days.length; i++) {
      const m = formatMonth(days[i]);
      if (m !== cur) {
        groups.push({ label: m, startIdx: i, count: 1 });
        cur = m;
      } else {
        groups[groups.length - 1].count++;
      }
    }
    return groups;
  }, [days]);

  // ── Bar position helpers ───────────────────────────────────────────────────
  function barProps(start: Date | null, end: Date | null) {
    if (!start || !end) return null;
    const s = startOfDay(new Date(start));
    const e = startOfDay(new Date(end));
    const left  = diffDays(rangeStart, s) * DAY_WIDTH;
    const width = Math.max(diffDays(s, e) * DAY_WIDTH, DAY_WIDTH * 2);
    return { left, width };
  }

  // ── Drag-to-move sprint bar ────────────────────────────────────────────────
  const dragState = useRef<{
    sprintId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);

  const handleBarMouseDown = useCallback(
    (
      e: React.MouseEvent,
      sprint: RoadmapSprint,
      type: "move" | "resize-left" | "resize-right",
    ) => {
      if (!sprint.startDate || !sprint.endDate) return;
      e.preventDefault();
      e.stopPropagation();
      dragState.current = {
        sprintId: sprint.id,
        type,
        startX: e.clientX,
        origStart: new Date(sprint.startDate),
        origEnd:   new Date(sprint.endDate),
      };
    },
    [],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const ds = dragState.current;
      if (!ds) return;

      const deltaDays = Math.round((e.clientX - ds.startX) / DAY_WIDTH);
      if (deltaDays === 0) return;

      setSprints((prev) =>
        prev.map((s) => {
          if (s.id !== ds.sprintId) return s;
          let newStart = new Date(ds.origStart);
          let newEnd   = new Date(ds.origEnd);

          if (ds.type === "move") {
            newStart = addDays(ds.origStart, deltaDays);
            newEnd   = addDays(ds.origEnd,   deltaDays);
          } else if (ds.type === "resize-left") {
            newStart = addDays(ds.origStart, deltaDays);
            if (newStart >= newEnd) newStart = addDays(newEnd, -1);
          } else {
            newEnd = addDays(ds.origEnd, deltaDays);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
          }

          return { ...s, startDate: newStart, endDate: newEnd };
        }),
      );
    }

    async function onMouseUp() {
      const ds = dragState.current;
      dragState.current = null;
      if (!ds) return;

      const sprint = sprints.find((s) => s.id === ds.sprintId);
      if (!sprint?.startDate || !sprint?.endDate) return;

      // Persist to server
      const result = await updateSprintDates(sprint.id, sprint.startDate, sprint.endDate);
      if (!result.success) {
        // Revert on failure
        setSprints((prev) =>
          prev.map((s) =>
            s.id === ds.sprintId
              ? { ...s, startDate: ds.origStart, endDate: ds.origEnd }
              : s,
          ),
        );
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [sprints]);

  // ── Today offset ──────────────────────────────────────────────────────────
  const todayLeft = diffDays(rangeStart, today) * DAY_WIDTH;

  // ── Rows ──────────────────────────────────────────────────────────────────
  const rows = view === "sprints" ? sprints : epics;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
            <button
              onClick={() => setView("sprints")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                view === "sprints"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="size-3.5" />
              Sprints
            </button>
            <button
              onClick={() => setView("epics")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                view === "epics"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="size-3.5" />
              Epics
            </button>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3.5" />
            <span>Drag bars to reschedule sprints</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              if (!scrollRef.current) return;
              const offset = diffDays(rangeStart, today) * DAY_WIDTH - 120;
              scrollRef.current.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
            }}
          >
            <Calendar className="size-3.5" />
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => scrollRef.current?.scrollBy({ left: -DAY_WIDTH * 14, behavior: "smooth" })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => scrollRef.current?.scrollBy({ left: DAY_WIDTH * 14, behavior: "smooth" })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Main grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left label panel */}
        <div
          className="shrink-0 border-r border-border bg-background"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header spacer */}
          <div
            className="flex items-end border-b border-border px-4 pb-2"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {view === "sprints" ? "Sprint" : "Epic"}
            </span>
          </div>

          {/* Label rows */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${HEADER_HEIGHT + 120}px)` }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
                    <span className="text-sm text-muted-foreground">
                      No {view} yet
                    </span>
                  </div>
                ) : (
                  rows.map((row) => (
                    <LabelRow
                      key={row.id}
                      row={row}
                      view={view}
                      projectKey={project.key}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto select-none">
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {/* Date header */}
            <div
              className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm"
              style={{ height: HEADER_HEIGHT }}
            >
              {/* Month row */}
              <div className="flex" style={{ height: 24 }}>
                {monthGroups.map((g) => (
                  <div
                    key={g.label + g.startIdx}
                    className="shrink-0 border-r border-border/50 px-2 flex items-center"
                    style={{ width: g.count * DAY_WIDTH }}
                  >
                    <span className="text-[11px] font-semibold text-foreground truncate">
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day row */}
              <div className="flex" style={{ height: 32 }}>
                {days.map((day, i) => {
                  const isToday = diffDays(today, day) === 0;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const showLabel = day.getDate() === 1 || i === 0 || day.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "shrink-0 flex items-center justify-center border-r border-border/30",
                        isWeekend && "bg-muted/30",
                        isToday && "bg-primary/10",
                      )}
                      style={{ width: DAY_WIDTH }}
                    >
                      {showLabel && (
                        <span className={cn(
                          "text-[10px] font-medium",
                          isToday ? "text-primary font-bold" : "text-muted-foreground",
                        )}>
                          {day.getDate()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid body */}
            <div className="relative">
              {/* Weekend shading + today line */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day, i) => {
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div
                      key={i}
                      className={cn("shrink-0 border-r border-border/20", isWeekend && "bg-muted/20")}
                      style={{ width: DAY_WIDTH }}
                    />
                  );
                })}
              </div>

              {/* Today vertical line */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-primary/60"
                style={{ left: todayLeft + DAY_WIDTH / 2 }}
              />

              {/* Rows */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {rows.length === 0 ? (
                    <div style={{ height: ROW_HEIGHT * 3 }} />
                  ) : (
                    rows.map((row, rowIdx) => {
                      if (view === "sprints") {
                        const sprint = row as RoadmapSprint;
                        const bp = barProps(sprint.startDate, sprint.endDate);
                        const colors = getSprintColor(sprint.status);
                        const progress = sprint.issueCount > 0
                          ? Math.round((sprint.doneCount / sprint.issueCount) * 100)
                          : 0;

                        return (
                          <div
                            key={sprint.id}
                            className={cn(
                              "relative border-b border-border/40",
                              rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10",
                            )}
                            style={{ height: ROW_HEIGHT }}
                          >
                            {bp ? (
                              <SprintBar
                                sprint={sprint}
                                left={bp.left}
                                width={bp.width}
                                colors={colors}
                                progress={progress}
                                onMouseDown={handleBarMouseDown}
                                tooltip={tooltip}
                                setTooltip={setTooltip}
                              />
                            ) : (
                              <NoDatePlaceholder />
                            )}
                          </div>
                        );
                      } else {
                        const epic = row as RoadmapEpic;
                        const bp = epic.dueDate
                          ? barProps(new Date(epic.createdAt), new Date(epic.dueDate))
                          : null;
                        const progress = epic.subTaskCount > 0
                          ? Math.round((epic.doneSubTaskCount / epic.subTaskCount) * 100)
                          : 0;

                        return (
                          <div
                            key={epic.id}
                            className={cn(
                              "relative border-b border-border/40",
                              rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10",
                            )}
                            style={{ height: ROW_HEIGHT }}
                          >
                            {bp ? (
                              <EpicBar
                                epic={epic}
                                left={bp.left}
                                width={bp.width}
                                progress={progress}
                                projectKey={project.key}
                              />
                            ) : (
                              <NoDatePlaceholder />
                            )}
                          </div>
                        );
                      }
                    })
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SprintBar ────────────────────────────────────────────────────────────────

interface SprintBarProps {
  sprint: RoadmapSprint;
  left: number;
  width: number;
  colors: ReturnType<typeof getSprintColor>;
  progress: number;
  onMouseDown: (e: React.MouseEvent, sprint: RoadmapSprint, type: "move" | "resize-left" | "resize-right") => void;
  tooltip: { id: string; x: number; y: number } | null;
  setTooltip: (v: { id: string; x: number; y: number } | null) => void;
}

function SprintBar({ sprint, left, width, colors, progress, onMouseDown, tooltip, setTooltip }: SprintBarProps) {
  const showTooltip = tooltip?.id === sprint.id;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left, width }}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 shadow-xl"
            style={{ minWidth: 200 }}
          >
            <p className="mb-1 text-sm font-semibold text-foreground">{sprint.name}</p>
            {sprint.goal && (
              <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{sprint.goal}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{sprint.startDate ? formatDate(new Date(sprint.startDate)) : "—"}</span>
              <span>→</span>
              <span>{sprint.endDate ? formatDate(new Date(sprint.endDate)) : "—"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{sprint.doneCount}/{sprint.issueCount} done</span>
              <span className={cn("font-medium", colors.text)}>{getStatusLabel(sprint.status)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bar */}
      <div
        className={cn(
          "group relative flex h-8 cursor-grab items-center rounded-md border px-2 active:cursor-grabbing",
          colors.bg, colors.border,
        )}
        onMouseDown={(e) => onMouseDown(e, sprint, "move")}
        onMouseEnter={(e) => setTooltip({ id: sprint.id, x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Resize handle left */}
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, sprint, "resize-left"); }}
        >
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>

        {/* Progress fill */}
        {progress > 0 && (
          <div
            className={cn("absolute left-0 top-0 h-full rounded-md opacity-30", colors.dot)}
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Label */}
        <span className={cn("relative z-10 truncate text-xs font-semibold", colors.text)}>
          {sprint.name}
        </span>

        {/* Progress % */}
        {sprint.issueCount > 0 && (
          <span className={cn("relative z-10 ml-auto shrink-0 pl-2 text-[10px] font-medium", colors.text)}>
            {progress}%
          </span>
        )}

        {/* Resize handle right */}
        <div
          className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, sprint, "resize-right"); }}
        >
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ─── EpicBar ──────────────────────────────────────────────────────────────────

interface EpicBarProps {
  epic: RoadmapEpic;
  left: number;
  width: number;
  progress: number;
  projectKey: string;
}

function EpicBar({ epic, left, width, progress, projectKey }: EpicBarProps) {
  const [showTip, setShowTip] = useState(false);
  const priorityCfg = getPriorityConfig(epic.priority);
  const PriorityIcon = priorityCfg.icon;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2"
      style={{ left, width }}
    >
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-border bg-popover p-3 shadow-xl"
            style={{ minWidth: 200 }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <PriorityIcon className={cn("size-3.5", priorityCfg.color)} />
              <p className="text-sm font-semibold text-foreground">{epic.title}</p>
            </div>
            <p className="mb-1 font-mono text-[11px] text-muted-foreground">
              {projectKey}-{epic.key}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{epic.doneSubTaskCount}/{epic.subTaskCount} sub-tasks</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">{getStatusLabel(epic.status)}</span>
            </div>
            {epic.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">
                Due {formatDate(new Date(epic.dueDate))}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="group relative flex h-8 cursor-default items-center rounded-md border border-purple-500/40 bg-purple-500/10 px-2"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {/* Progress fill */}
        {progress > 0 && (
          <div
            className="absolute left-0 top-0 h-full rounded-md bg-purple-500/25"
            style={{ width: `${progress}%` }}
          />
        )}

        <span className="relative z-10 truncate text-xs font-semibold text-purple-600 dark:text-purple-400">
          {epic.title}
        </span>

        {epic.subTaskCount > 0 && (
          <span className="relative z-10 ml-auto shrink-0 pl-2 text-[10px] font-medium text-purple-600/70 dark:text-purple-400/70">
            {progress}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── LabelRow ─────────────────────────────────────────────────────────────────

interface LabelRowProps {
  row: RoadmapSprint | RoadmapEpic;
  view: "sprints" | "epics";
  projectKey: string;
}

function LabelRow({ row, view, projectKey }: LabelRowProps) {
  if (view === "sprints") {
    const sprint = row as RoadmapSprint;
    const colors = getSprintColor(sprint.status);

    return (
      <div
        className="flex items-center gap-2.5 border-b border-border/40 px-4"
        style={{ height: ROW_HEIGHT }}
      >
        <div className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{sprint.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {sprint.issueCount} issue{sprint.issueCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px] px-1.5 py-0", colors.text, "border-current/30")}
        >
          {getStatusLabel(sprint.status)}
        </Badge>
      </div>
    );
  }

  const epic = row as RoadmapEpic;
  const priorityCfg = getPriorityConfig(epic.priority);
  const PriorityIcon = priorityCfg.icon;

  return (
    <div
      className="flex items-center gap-2.5 border-b border-border/40 px-4"
      style={{ height: ROW_HEIGHT }}
    >
      <PriorityIcon className={cn("size-3.5 shrink-0", priorityCfg.color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{epic.title}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {projectKey}-{epic.key}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-purple-600 dark:text-purple-400">
        {getStatusLabel(epic.status)}
      </span>
    </div>
  );
}

// ─── NoDatePlaceholder ────────────────────────────────────────────────────────

function NoDatePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center px-4">
      <span className="text-xs text-muted-foreground/50 italic">No dates set</span>
    </div>
  );
}
