"use client";

import {
  useState, useRef, useCallback, useEffect, useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, ChevronRight, Calendar, Zap, LayoutList,
  GripVertical, Users, Layers, ZoomIn, ZoomOut,
  Info, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { updateSprintDates } from "../../sprints/actions";
import { updateIssue } from "../../issues/actions";
import { getPriorityConfig, getStatusConfig, getTypeConfig } from "@/lib/issue-config";

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

export interface RoadmapIssue {
  id: string;
  key: number;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  createdAt: Date;
  sprintId: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

export interface RoadmapMember {
  id: string;
  name: string;
  image: string | null;
}

interface RoadmapClientProps {
  project: { id: string; name: string; key: string };
  sprints: RoadmapSprint[];
  epics: RoadmapEpic[];
  issues: RoadmapIssue[];
  members: RoadmapMember[];
  workspaceSlug: string;
}

// ─── Zoom config ──────────────────────────────────────────────────────────────

type ZoomLevel = "week" | "month" | "quarter";

const ZOOM_CONFIG: Record<ZoomLevel, { dayWidth: number; label: string }> = {
  week:    { dayWidth: 48, label: "Week"    },
  month:   { dayWidth: 28, label: "Month"   },
  quarter: { dayWidth: 14, label: "Quarter" },
};

// ─── View / group config ──────────────────────────────────────────────────────

type ViewMode  = "sprints" | "epics" | "issues";
type GroupMode = "none" | "sprint" | "assignee";

// ─── Layout constants ─────────────────────────────────────────────────────────

const ROW_HEIGHT    = 48;
const LABEL_WIDTH   = 240;
const HEADER_HEIGHT = 56;
const GROUP_HEIGHT  = 36;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
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
function formatMonthShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) { days.push(new Date(cur)); cur = addDays(cur, 1); }
  return days;
}
function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function getSprintColor(status: RoadmapSprint["status"]) {
  switch (status) {
    case "ACTIVE":    return { bg: "bg-primary/15",   border: "border-primary/50",    text: "text-primary",                dot: "bg-primary"           };
    case "COMPLETED": return { bg: "bg-muted/50",     border: "border-border",        text: "text-muted-foreground",       dot: "bg-muted-foreground"  };
    default:          return { bg: "bg-blue-500/10",  border: "border-blue-500/40",   text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500"    };
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

// ─── Main component ───────────────────────────────────────────────────────────

export function RoadmapClient({
  project,
  sprints: initialSprints,
  epics,
  issues: initialIssues,
  members,
  workspaceSlug,
}: RoadmapClientProps) {
  const [sprints, setSprints] = useState<RoadmapSprint[]>(
    initialSprints.map((s) => ({
      ...s,
      startDate: s.startDate ? new Date(s.startDate) : null,
      endDate:   s.endDate   ? new Date(s.endDate)   : null,
    })),
  );
  const [issues, setIssues] = useState<RoadmapIssue[]>(
    initialIssues.map((i) => ({
      ...i,
      dueDate:   i.dueDate   ? new Date(i.dueDate)   : null,
      createdAt: new Date(i.createdAt),
    })),
  );

  const [view, setView]       = useState<ViewMode>("sprints");
  const [group, setGroup]     = useState<GroupMode>("none");
  const [zoom, setZoom]       = useState<ZoomLevel>("month");
  const [tooltip, setTooltip] = useState<string | null>(null);

  const DAY_WIDTH = ZOOM_CONFIG[zoom].dayWidth;

  // ── Date range ────────────────────────────────────────────────────────────────
  const today = useMemo(() => startOfDay(new Date()), []);

  const { rangeStart, rangeEnd } = useMemo(() => {
    const allDates: Date[] = [addDays(today, -21)];
    for (const s of sprints) {
      if (s.startDate) allDates.push(addDays(new Date(s.startDate), -14));
      if (s.endDate)   allDates.push(addDays(new Date(s.endDate),    14));
    }
    for (const e of epics) {
      if (e.dueDate) allDates.push(addDays(new Date(e.dueDate), 14));
      allDates.push(addDays(new Date(e.createdAt), -14));
    }
    for (const i of issues) {
      if (i.dueDate) allDates.push(addDays(new Date(i.dueDate), 14));
    }
    const start = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const end   = new Date(Math.max(...allDates.map((d) => d.getTime()), addDays(today, 90).getTime()));
    return { rangeStart: startOfDay(start), rangeEnd: startOfDay(end) };
  }, [sprints, epics, issues, today]);

  const days       = useMemo(() => getDaysInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const totalWidth = days.length * DAY_WIDTH;
  const todayLeft  = diffDays(rangeStart, today) * DAY_WIDTH;

  // ── Month groups ──────────────────────────────────────────────────────────────
  const monthGroups = useMemo(() => {
    const groups: { label: string; startIdx: number; count: number }[] = [];
    let cur = "";
    for (let i = 0; i < days.length; i++) {
      const m = zoom === "quarter" ? formatMonthShort(days[i]) : formatMonth(days[i]);
      if (m !== cur) { groups.push({ label: m, startIdx: i, count: 1 }); cur = m; }
      else groups[groups.length - 1].count++;
    }
    return groups;
  }, [days, zoom]);

  // ── Scroll to today ───────────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scrollRef.current) return;
    const offset = todayLeft - 160;
    scrollRef.current.scrollLeft = Math.max(0, offset);
  }, [todayLeft]);

  // ── Bar position ──────────────────────────────────────────────────────────────
  function barProps(start: Date | null, end: Date | null) {
    if (!start || !end) return null;
    const s = startOfDay(new Date(start));
    const e = startOfDay(new Date(end));
    const left  = diffDays(rangeStart, s) * DAY_WIDTH;
    const width = Math.max(diffDays(s, e) * DAY_WIDTH, DAY_WIDTH * 2);
    return { left, width };
  }

  // ── Sprint drag ───────────────────────────────────────────────────────────────
  const dragState = useRef<{
    sprintId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);

  const handleSprintMouseDown = useCallback(
    (e: React.MouseEvent, sprint: RoadmapSprint, type: "move" | "resize-left" | "resize-right") => {
      if (!sprint.startDate || !sprint.endDate) return;
      e.preventDefault(); e.stopPropagation();
      dragState.current = {
        sprintId: sprint.id, type, startX: e.clientX,
        origStart: new Date(sprint.startDate), origEnd: new Date(sprint.endDate),
      };
    }, [],
  );

  // ── Issue drag (due date) ─────────────────────────────────────────────────────
  const issueDragState = useRef<{
    issueId: string;
    startX: number;
    origDue: Date;
  } | null>(null);

  const handleIssueMouseDown = useCallback(
    (e: React.MouseEvent, issue: RoadmapIssue) => {
      if (!issue.dueDate) return;
      e.preventDefault(); e.stopPropagation();
      issueDragState.current = {
        issueId: issue.id, startX: e.clientX, origDue: new Date(issue.dueDate),
      };
    }, [],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      // Sprint drag
      const ds = dragState.current;
      if (ds) {
        const deltaDays = Math.round((e.clientX - ds.startX) / DAY_WIDTH);
        if (deltaDays === 0) return;
        setSprints((prev) => prev.map((s) => {
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
        }));
      }

      // Issue drag
      const id = issueDragState.current;
      if (id) {
        const deltaDays = Math.round((e.clientX - id.startX) / DAY_WIDTH);
        if (deltaDays === 0) return;
        setIssues((prev) => prev.map((i) => {
          if (i.id !== id.issueId) return i;
          return { ...i, dueDate: addDays(id.origDue, deltaDays) };
        }));
      }
    }

    async function onMouseUp() {
      // Sprint persist
      const ds = dragState.current;
      dragState.current = null;
      if (ds) {
        const sprint = sprints.find((s) => s.id === ds.sprintId);
        if (sprint?.startDate && sprint?.endDate) {
          const result = await updateSprintDates(sprint.id, sprint.startDate, sprint.endDate);
          if (!result.success) {
            setSprints((prev) => prev.map((s) =>
              s.id === ds.sprintId ? { ...s, startDate: ds.origStart, endDate: ds.origEnd } : s,
            ));
          }
        }
      }

      // Issue persist
      const id = issueDragState.current;
      issueDragState.current = null;
      if (id) {
        const issue = issues.find((i) => i.id === id.issueId);
        if (issue?.dueDate) {
          const result = await updateIssue(issue.id, { dueDate: issue.dueDate });
          if (!result?.success) {
            setIssues((prev) => prev.map((i) =>
              i.id === id.issueId ? { ...i, dueDate: id.origDue } : i,
            ));
          }
        }
      }
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [sprints, issues, DAY_WIDTH]);

  // ── Grouped rows for issues view ──────────────────────────────────────────────
  const groupedIssues = useMemo(() => {
    if (view !== "issues") return [];

    if (group === "none") {
      return [{ key: "all", label: "All Issues", items: issues }];
    }

    if (group === "sprint") {
      const map = new Map<string, { label: string; items: RoadmapIssue[] }>();
      map.set("none", { label: "No Sprint", items: [] });
      for (const s of sprints) map.set(s.id, { label: s.name, items: [] });
      for (const i of issues) {
        const k = i.sprintId ?? "none";
        if (!map.has(k)) map.set(k, { label: "Unknown Sprint", items: [] });
        map.get(k)!.items.push(i);
      }
      return Array.from(map.entries())
        .filter(([, v]) => v.items.length > 0)
        .map(([k, v]) => ({ key: k, label: v.label, items: v.items }));
    }

    if (group === "assignee") {
      const map = new Map<string, { label: string; image: string | null; items: RoadmapIssue[] }>();
      map.set("unassigned", { label: "Unassigned", image: null, items: [] });
      for (const m of members) map.set(m.id, { label: m.name, image: m.image, items: [] });
      for (const i of issues) {
        const k = i.assigneeId ?? "unassigned";
        if (!map.has(k)) map.set(k, { label: "Unknown", image: null, items: [] });
        map.get(k)!.items.push(i);
      }
      return Array.from(map.entries())
        .filter(([, v]) => v.items.length > 0)
        .map(([k, v]) => ({ key: k, label: v.label, image: (v as { image?: string | null }).image ?? null, items: v.items }));
    }

    return [];
  }, [view, group, issues, sprints, members]);

  // ── Scroll helpers ────────────────────────────────────────────────────────────
  function scrollToToday() {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(0, todayLeft - 160), behavior: "smooth" });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const rows = view === "sprints" ? sprints : view === "epics" ? epics : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-sm"
      >
        {/* Left: view + group */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
            {(["sprints", "epics", "issues"] as ViewMode[]).map((v) => {
              const icons: Record<ViewMode, React.ReactNode> = {
                sprints: <Zap className="size-3.5" />,
                epics:   <LayoutList className="size-3.5" />,
                issues:  <Layers className="size-3.5" />,
              };
              return (
                <button
                  key={v}
                  onClick={() => { setView(v); if (v !== "issues") setGroup("none"); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                    view === v
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {icons[v]}
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Group by (issues only) */}
          {view === "issues" && (
            <Select value={group} onValueChange={(v) => setGroup(v as GroupMode)}>
              <SelectTrigger className={cn("h-8 w-40 text-xs", group !== "none" && "border-primary text-primary")}>
                <Users className="mr-1.5 size-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="sprint">Group by sprint</SelectItem>
                <SelectItem value="assignee">Group by assignee</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Info className="size-3.5" />
            <span>Drag bars to reschedule</span>
          </div>
        </div>

        {/* Right: zoom + navigation */}
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
            {(["week", "month", "quarter"] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                  zoom === z
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {ZOOM_CONFIG[z].label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-border" />

          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={scrollToToday}>
            <Calendar className="size-3.5" />
            Today
          </Button>
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => scrollRef.current?.scrollBy({ left: -DAY_WIDTH * 14, behavior: "smooth" })}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => scrollRef.current?.scrollBy({ left: DAY_WIDTH * 14, behavior: "smooth" })}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Main grid ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left label panel */}
        <div className="shrink-0 border-r border-border bg-background" style={{ width: LABEL_WIDTH }}>
          {/* Header spacer */}
          <div className="flex items-end border-b border-border px-4 pb-2" style={{ height: HEADER_HEIGHT }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {view === "sprints" ? "Sprint" : view === "epics" ? "Epic" : "Issue"}
            </span>
          </div>

          {/* Label rows */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${HEADER_HEIGHT + 100}px)` }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${view}-${group}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {view === "sprints" && (
                  sprints.length === 0
                    ? <EmptyLabel text="No sprints yet" />
                    : sprints.map((s) => <SprintLabelRow key={s.id} sprint={s} />)
                )}
                {view === "epics" && (
                  epics.length === 0
                    ? <EmptyLabel text="No epics yet" />
                    : epics.map((e) => <EpicLabelRow key={e.id} epic={e} projectKey={project.key} />)
                )}
                {view === "issues" && (
                  groupedIssues.length === 0
                    ? <EmptyLabel text="No issues with due dates" />
                    : groupedIssues.map((g) => (
                        <div key={g.key}>
                          {group !== "none" && (
                            <GroupLabelHeader
                              label={g.label}
                              count={g.items.length}
                              image={(g as { image?: string | null }).image ?? null}
                            />
                          )}
                          {g.items.map((i) => (
                            <IssueLabelRow
                              key={i.id}
                              issue={i}
                              projectKey={project.key}
                              workspaceSlug={workspaceSlug}
                            />
                          ))}
                        </div>
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
                    <span className="text-[11px] font-semibold text-foreground truncate">{g.label}</span>
                  </div>
                ))}
              </div>

              {/* Day row */}
              <div className="flex" style={{ height: 32 }}>
                {days.map((day, i) => {
                  const isToday   = diffDays(today, day) === 0;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  const showLabel = zoom === "week"
                    ? true
                    : zoom === "month"
                      ? (day.getDate() === 1 || i === 0 || day.getDay() === 1)
                      : (day.getDate() === 1 || i === 0);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "shrink-0 flex items-center justify-center border-r border-border/30",
                        isWeekend && "bg-muted/20",
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
              {/* Column shading */}
              <div className="pointer-events-none absolute inset-0 flex">
                {days.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "shrink-0 border-r border-border/15",
                      (day.getDay() === 0 || day.getDay() === 6) && "bg-muted/15",
                    )}
                    style={{ width: DAY_WIDTH }}
                  />
                ))}
              </div>

              {/* Today line */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-primary/50"
                style={{ left: todayLeft + DAY_WIDTH / 2 }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 size-2 rounded-full bg-primary" />
              </div>

              {/* Rows */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${view}-${group}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {view === "sprints" && (
                    sprints.length === 0
                      ? <EmptyTimeline />
                      : sprints.map((sprint, idx) => {
                          const bp = barProps(sprint.startDate, sprint.endDate);
                          const colors = getSprintColor(sprint.status);
                          const progress = sprint.issueCount > 0
                            ? Math.round((sprint.doneCount / sprint.issueCount) * 100)
                            : 0;
                          return (
                            <TimelineRow key={sprint.id} idx={idx}>
                              {bp ? (
                                <SprintBar
                                  sprint={sprint} left={bp.left} width={bp.width}
                                  colors={colors} progress={progress}
                                  onMouseDown={handleSprintMouseDown}
                                  tooltip={tooltip} setTooltip={setTooltip}
                                />
                              ) : <NoDatePlaceholder />}
                            </TimelineRow>
                          );
                        })
                  )}

                  {view === "epics" && (
                    epics.length === 0
                      ? <EmptyTimeline />
                      : epics.map((epic, idx) => {
                          const bp = epic.dueDate
                            ? barProps(new Date(epic.createdAt), new Date(epic.dueDate))
                            : null;
                          const progress = epic.subTaskCount > 0
                            ? Math.round((epic.doneSubTaskCount / epic.subTaskCount) * 100)
                            : 0;
                          return (
                            <TimelineRow key={epic.id} idx={idx}>
                              {bp ? (
                                <EpicBar
                                  epic={epic} left={bp.left} width={bp.width}
                                  progress={progress} projectKey={project.key}
                                  workspaceSlug={workspaceSlug}
                                />
                              ) : <NoDatePlaceholder />}
                            </TimelineRow>
                          );
                        })
                  )}

                  {view === "issues" && (
                    groupedIssues.length === 0
                      ? <EmptyTimeline />
                      : groupedIssues.map((g) => (
                          <div key={g.key}>
                            {group !== "none" && (
                              <div
                                className="border-b border-border/40 bg-muted/20"
                                style={{ height: GROUP_HEIGHT }}
                              />
                            )}
                            {g.items.map((issue, idx) => {
                              const bp = issue.dueDate
                                ? barProps(new Date(issue.createdAt), new Date(issue.dueDate))
                                : null;
                              return (
                                <TimelineRow key={issue.id} idx={idx}>
                                  {bp ? (
                                    <IssueBar
                                      issue={issue} left={bp.left} width={bp.width}
                                      projectKey={project.key}
                                      workspaceSlug={workspaceSlug}
                                      onMouseDown={handleIssueMouseDown}
                                      tooltip={tooltip} setTooltip={setTooltip}
                                    />
                                  ) : <NoDatePlaceholder />}
                                </TimelineRow>
                              );
                            })}
                          </div>
                        ))
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

// ─── TimelineRow ──────────────────────────────────────────────────────────────

function TimelineRow({ idx, children }: { idx: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.3) }}
      className={cn(
        "relative border-b border-border/30",
        idx % 2 === 0 ? "bg-background" : "bg-muted/5",
      )}
      style={{ height: ROW_HEIGHT }}
    >
      {children}
    </motion.div>
  );
}

// ─── SprintBar ────────────────────────────────────────────────────────────────

interface SprintBarProps {
  sprint: RoadmapSprint;
  left: number; width: number;
  colors: ReturnType<typeof getSprintColor>;
  progress: number;
  onMouseDown: (e: React.MouseEvent, sprint: RoadmapSprint, type: "move" | "resize-left" | "resize-right") => void;
  tooltip: string | null;
  setTooltip: (v: string | null) => void;
}

function SprintBar({ sprint, left, width, colors, progress, onMouseDown, tooltip, setTooltip }: SprintBarProps) {
  const showTip = tooltip === sprint.id;
  return (
    <div className="absolute top-1/2 -translate-y-1/2" style={{ left, width }}>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 rounded-xl border border-border bg-popover p-3.5 shadow-xl"
            style={{ minWidth: 220 }}
          >
            <p className="mb-1 text-sm font-semibold text-foreground">{sprint.name}</p>
            {sprint.goal && <p className="mb-2 text-xs text-muted-foreground line-clamp-2">{sprint.goal}</p>}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{sprint.startDate ? formatDate(new Date(sprint.startDate)) : "—"}</span>
              <span>→</span>
              <span>{sprint.endDate ? formatDate(new Date(sprint.endDate)) : "—"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{sprint.doneCount}/{sprint.issueCount} done</span>
              <span className={cn("font-semibold", colors.text)}>{getStatusLabel(sprint.status)}</span>
            </div>
            {sprint.issueCount > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className={cn("h-full rounded-full", colors.dot)} style={{ width: `${progress}%` }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "group relative flex h-8 cursor-grab items-center rounded-lg border px-2.5 active:cursor-grabbing transition-shadow hover:shadow-md",
          colors.bg, colors.border,
        )}
        onMouseDown={(e) => onMouseDown(e, sprint, "move")}
        onMouseEnter={() => setTooltip(sprint.id)}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Resize left */}
        <div
          className="absolute left-0 top-0 h-full w-2.5 cursor-ew-resize rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, sprint, "resize-left"); }}
        >
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>

        {/* Progress fill */}
        {progress > 0 && (
          <div
            className={cn("absolute left-0 top-0 h-full rounded-lg opacity-25", colors.dot)}
            style={{ width: `${progress}%` }}
          />
        )}

        <span className={cn("relative z-10 truncate text-xs font-semibold", colors.text)}>
          {sprint.name}
        </span>
        {sprint.issueCount > 0 && (
          <span className={cn("relative z-10 ml-auto shrink-0 pl-2 text-[10px] font-medium opacity-80", colors.text)}>
            {progress}%
          </span>
        )}

        {/* Resize right */}
        <div
          className="absolute right-0 top-0 h-full w-2.5 cursor-ew-resize rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, sprint, "resize-right"); }}
        >
          <GripVertical className="size-2.5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// ─── EpicBar ──────────────────────────────────────────────────────────────────

function EpicBar({
  epic, left, width, progress, projectKey, workspaceSlug,
}: {
  epic: RoadmapEpic; left: number; width: number; progress: number;
  projectKey: string; workspaceSlug: string;
}) {
  const [showTip, setShowTip] = useState(false);
  const priorityCfg = getPriorityConfig(epic.priority);
  const PriorityIcon = priorityCfg.icon;

  return (
    <div className="absolute top-1/2 -translate-y-1/2" style={{ left, width }}>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 rounded-xl border border-border bg-popover p-3.5 shadow-xl"
            style={{ minWidth: 220 }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <PriorityIcon className={cn("size-3.5", priorityCfg.color)} />
              <p className="text-sm font-semibold text-foreground">{epic.title}</p>
            </div>
            <p className="mb-2 font-mono text-[11px] text-muted-foreground">{projectKey}-{epic.key}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{epic.doneSubTaskCount}/{epic.subTaskCount} sub-tasks</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{getStatusLabel(epic.status)}</span>
            </div>
            {epic.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(new Date(epic.dueDate))}</p>
            )}
            {epic.subTaskCount > 0 && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-purple-500" style={{ width: `${progress}%` }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={`/workspace/${workspaceSlug}/projects/${projectKey}/issues/${epic.key}`}
        className="group relative flex h-8 cursor-pointer items-center rounded-lg border border-purple-500/40 bg-purple-500/10 px-2.5 transition-all hover:border-purple-500/60 hover:shadow-md"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        {progress > 0 && (
          <div className="absolute left-0 top-0 h-full rounded-lg bg-purple-500/20" style={{ width: `${progress}%` }} />
        )}
        <span className="relative z-10 truncate text-xs font-semibold text-purple-600 dark:text-purple-400">
          {epic.title}
        </span>
        {epic.subTaskCount > 0 && (
          <span className="relative z-10 ml-auto shrink-0 pl-2 text-[10px] font-medium text-purple-600/70 dark:text-purple-400/70">
            {progress}%
          </span>
        )}
      </a>
    </div>
  );
}

// ─── IssueBar ─────────────────────────────────────────────────────────────────

function IssueBar({
  issue, left, width, projectKey, workspaceSlug, onMouseDown, tooltip, setTooltip,
}: {
  issue: RoadmapIssue; left: number; width: number;
  projectKey: string; workspaceSlug: string;
  onMouseDown: (e: React.MouseEvent, issue: RoadmapIssue) => void;
  tooltip: string | null; setTooltip: (v: string | null) => void;
}) {
  const showTip = tooltip === issue.id;
  const statusCfg   = getStatusConfig(issue.status);
  const priorityCfg = getPriorityConfig(issue.priority);
  const typeCfg     = getTypeConfig(issue.type);
  const StatusIcon   = statusCfg.icon;
  const PriorityIcon = priorityCfg.icon;
  const TypeIcon     = typeCfg.icon;

  // Color by type
  const barColor =
    issue.type === "BUG"   ? "bg-destructive/15 border-destructive/40 text-destructive"
    : issue.type === "STORY" ? "bg-primary/15 border-primary/40 text-primary"
    : "bg-muted/60 border-border text-foreground";

  return (
    <div className="absolute top-1/2 -translate-y-1/2" style={{ left, width }}>
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-50 mb-2.5 -translate-x-1/2 rounded-xl border border-border bg-popover p-3.5 shadow-xl"
            style={{ minWidth: 220 }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <TypeIcon className={cn("size-3.5", typeCfg.color)} />
              <p className="text-sm font-semibold text-foreground">{issue.title}</p>
            </div>
            <p className="mb-2 font-mono text-[11px] text-muted-foreground">{projectKey}-{issue.key}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <PriorityIcon className={cn("size-3", priorityCfg.color)} />
                {priorityCfg.label}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <StatusIcon className={cn("size-3", statusCfg.color)} />
                {statusCfg.label}
              </span>
            </div>
            {issue.dueDate && (
              <p className="mt-1 text-xs text-muted-foreground">Due {formatDate(new Date(issue.dueDate))}</p>
            )}
            {issue.assignee && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Avatar className="size-4">
                  <AvatarImage src={issue.assignee.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">{getInitials(issue.assignee.name)}</AvatarFallback>
                </Avatar>
                {issue.assignee.name}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "group relative flex h-8 cursor-grab items-center rounded-lg border px-2.5 active:cursor-grabbing transition-shadow hover:shadow-md",
          barColor,
        )}
        onMouseDown={(e) => onMouseDown(e, issue)}
        onMouseEnter={() => setTooltip(issue.id)}
        onMouseLeave={() => setTooltip(null)}
      >
        <TypeIcon className={cn("mr-1.5 size-3 shrink-0", typeCfg.color)} />
        <span className="relative z-10 truncate text-xs font-medium">
          {issue.title}
        </span>
        <a
          href={`/workspace/${workspaceSlug}/projects/${projectKey}/issues/${issue.key}`}
          className="relative z-10 ml-auto shrink-0 pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
        </a>
      </div>
    </div>
  );
}

// ─── Label rows ───────────────────────────────────────────────────────────────

function SprintLabelRow({ sprint }: { sprint: RoadmapSprint }) {
  const colors = getSprintColor(sprint.status);
  return (
    <div className="flex items-center gap-2.5 border-b border-border/30 px-4" style={{ height: ROW_HEIGHT }}>
      <div className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{sprint.name}</p>
        <p className="text-[11px] text-muted-foreground">{sprint.issueCount} issue{sprint.issueCount !== 1 ? "s" : ""}</p>
      </div>
      <Badge variant="outline" className={cn("shrink-0 text-[10px] px-1.5 py-0 border-current/30", colors.text)}>
        {getStatusLabel(sprint.status)}
      </Badge>
    </div>
  );
}

function EpicLabelRow({ epic, projectKey }: { epic: RoadmapEpic; projectKey: string }) {
  const priorityCfg = getPriorityConfig(epic.priority);
  const PriorityIcon = priorityCfg.icon;
  return (
    <div className="flex items-center gap-2.5 border-b border-border/30 px-4" style={{ height: ROW_HEIGHT }}>
      <PriorityIcon className={cn("size-3.5 shrink-0", priorityCfg.color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{epic.title}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{projectKey}-{epic.key}</p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-purple-600 dark:text-purple-400">
        {getStatusLabel(epic.status)}
      </span>
    </div>
  );
}

function IssueLabelRow({
  issue, projectKey, workspaceSlug,
}: { issue: RoadmapIssue; projectKey: string; workspaceSlug: string }) {
  const priorityCfg = getPriorityConfig(issue.priority);
  const typeCfg     = getTypeConfig(issue.type);
  const PriorityIcon = priorityCfg.icon;
  const TypeIcon     = typeCfg.icon;
  return (
    <div className="flex items-center gap-2 border-b border-border/30 px-4" style={{ height: ROW_HEIGHT }}>
      <PriorityIcon className={cn("size-3.5 shrink-0", priorityCfg.color)} />
      <TypeIcon className={cn("size-3.5 shrink-0", typeCfg.color)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{issue.title}</p>
        <p className="font-mono text-[11px] text-muted-foreground">{projectKey}-{issue.key}</p>
      </div>
      {issue.assignee && (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={issue.assignee.image ?? undefined} />
          <AvatarFallback className="text-[8px]">{getInitials(issue.assignee.name)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function GroupLabelHeader({
  label, count, image,
}: { label: string; count: number; image: string | null }) {
  return (
    <div
      className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4"
      style={{ height: GROUP_HEIGHT }}
    >
      {image !== undefined && (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={image ?? undefined} />
          <AvatarFallback className="text-[8px]">{getInitials(label)}</AvatarFallback>
        </Avatar>
      )}
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function NoDatePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center px-4">
      <span className="text-xs italic text-muted-foreground/40">No dates set</span>
    </div>
  );
}

function EmptyLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16 px-4">
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  );
}

function EmptyTimeline() {
  return <div style={{ height: ROW_HEIGHT * 3 }} />;
}
