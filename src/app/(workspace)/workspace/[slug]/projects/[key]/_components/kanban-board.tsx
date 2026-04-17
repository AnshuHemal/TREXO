/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { AnimatePresence } from "motion/react";
import { ISSUE_STATUSES, getPriorityConfig } from "@/lib/issue-config";
import { moveIssue, createIssue } from "../issues/actions";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { IssueDetailModal, type IssueDetail } from "../issues/_components/issue-detail-modal";
import { BoardFilterBar, type SwimlaneMode } from "./board-filter-bar";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BoardIssue {
  id: string;
  key: number;
  title: string;
  type: string;
  status: string;
  priority: string;
  position: number;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  commentCount: number;
  dueDate?: Date | null;
  // Epic grouping
  epicId?: string | null;
  epicTitle?: string | null;
}

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface KanbanBoardProps {
  project: { id: string; name: string; key: string };
  issues: BoardIssue[];
  members: Member[];
  currentUserId: string;
  currentUserName?: string;
  currentUserImage?: string | null;
  workspaceSlug: string;
}

// ─── Position helpers ─────────────────────────────────────────────────────────

const POSITION_GAP = 1000;

function computeNewPosition(
  issues: BoardIssue[],
  overIndex: number,
  activeId: string,
): number {
  const filtered = issues.filter((i) => i.id !== activeId);

  if (filtered.length === 0) return POSITION_GAP;

  const above = filtered[overIndex - 1];
  const below = filtered[overIndex];

  if (!above && below) return below.position - POSITION_GAP;
  if (above && !below) return above.position + POSITION_GAP;
  if (above && below) return (above.position + below.position) / 2;

  return POSITION_GAP;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanBoard({
  project,
  issues: initialIssues,
  members,
  currentUserId,
  currentUserName,
  currentUserImage,
  workspaceSlug: _workspaceSlug,
}: KanbanBoardProps) {
  const [issues, setIssues] = useState<BoardIssue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<BoardIssue | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail] = useState<IssueDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ── Filter + swimlane state ───────────────────────────────────────────────────
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [swimlane, setSwimlane]             = useState<SwimlaneMode>("none");

  // WIP limits per status (configurable — defaults shown)
  const WIP_LIMITS: Record<string, number> = {
    IN_PROGRESS: 5,
    IN_REVIEW:   3,
  };

  const hasActiveFilters = filterAssignee !== "all" || filterPriority !== "all" || swimlane !== "none";

  function clearFilters() {
    setFilterAssignee("all");
    setFilterPriority("all");
    setSwimlane("none");
  }

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  // PointerSensor with a 5px activation distance prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // ── Issues grouped by status — exclude sub-tasks from the board ──────────────
  const columnIssues = useCallback(
    (status: string) => {
      return issues
        .filter((i) => {
          if (i.status !== status || i.type === "SUBTASK") return false;
          if (filterAssignee === "unassigned" && i.assigneeId !== null) return false;
          if (filterAssignee !== "all" && filterAssignee !== "unassigned" && i.assigneeId !== filterAssignee) return false;
          if (filterPriority !== "all" && i.priority !== filterPriority) return false;
          return true;
        })
        .sort((a, b) => a.position - b.position);
    },
    [issues, filterAssignee, filterPriority],
  );

  // ── Swimlane grouping ─────────────────────────────────────────────────────────
  function getSwimlaneGroups(colIssues: BoardIssue[]): { key: string; label: string; issues: BoardIssue[] }[] {
    if (swimlane === "none") return [{ key: "all", label: "", issues: colIssues }];

    const map = new Map<string, BoardIssue[]>();
    for (const issue of colIssues) {
      const key = swimlane === "assignee"
        ? (issue.assignee?.name ?? "Unassigned")
        : issue.priority;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(issue);
    }

    const entries = Array.from(map.entries()).map(([key, iss]) => ({
      key,
      label: swimlane === "priority" ? getPriorityConfig(key).label : key,
      issues: iss,
    }));

    if (swimlane === "priority") {
      const ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NO_PRIORITY: 4 };
      entries.sort((a, b) => (ORDER[a.key] ?? 99) - (ORDER[b.key] ?? 99));
    } else {
      entries.sort((a, b) => a.key.localeCompare(b.key));
    }

    return entries;
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const issue = issues.find((i) => i.id === active.id);
    setActiveIssue(issue ?? null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;

    const activeIssueData = issues.find((i) => i.id === active.id);
    if (!activeIssueData) return;

    // Determine target status — over could be a column or a card
    const overStatus = (over.data.current?.status ?? over.id) as string;

    if (activeIssueData.status !== overStatus) {
      // Moving to a different column — update status optimistically
      setIssues((prev) =>
        prev.map((i) =>
          i.id === active.id ? { ...i, status: overStatus } : i,
        ),
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveIssue(null);

    if (!over) return;

    const activeIssueData = issues.find((i) => i.id === active.id);
    if (!activeIssueData) return;

    const targetStatus = (over.data.current?.status ?? over.id) as string;
    const columnItems = issues
      .filter((i) => i.status === targetStatus && i.id !== active.id)
      .sort((a, b) => a.position - b.position);

    // Find where in the column the card was dropped
    const overIndex = over.data.current?.sortable?.index ?? columnItems.length;
    const newPosition = computeNewPosition(
      issues.filter((i) => i.status === targetStatus),
      overIndex,
      active.id as string,
    );

    // Optimistic update
    setIssues((prev) =>
      prev.map((i) =>
        i.id === active.id
          ? { ...i, status: targetStatus, position: newPosition }
          : i,
      ),
    );

    // Sync to server (fire-and-forget — optimistic update already applied)
    moveIssue(active.id as string, targetStatus as never, newPosition).catch(() => {
      // On failure, revert to server state by reloading
      window.location.reload();
    });
  }

  // ── Quick-create ──────────────────────────────────────────────────────────────

  async function handleQuickCreate(status: string, title: string) {
    const result = await createIssue({
      projectId: project.id,
      title,
      status: status as never,
    });

    if (result.success && result.data) {
      const colIssues = columnIssues(status);
      const position =
        colIssues.length > 0
          ? colIssues[colIssues.length - 1].position + POSITION_GAP
          : POSITION_GAP;

      const newIssue: BoardIssue = {
        id: result.data.id,
        key: result.data.key,
        title,
        type: "TASK",
        status,
        priority: "MEDIUM",
        position,
        assigneeId: null,
        assignee: null,
        commentCount: 0,
      };

      setIssues((prev) => [...prev, newIssue]);
    }
  }

  // ── Issue detail modal ────────────────────────────────────────────────────────

  async function handleOpenIssue(issueId: string) {
    setSelectedIssueId(issueId);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) {
        const data = await res.json();
        setIssueDetail(data);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function handleCloseModal() {
    setSelectedIssueId(null);
    setIssueDetail(null);
  }

  function handleIssueDeleted() {
    if (selectedIssueId) {
      setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
    }
    handleCloseModal();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Filter bar */}
      <BoardFilterBar
        members={members}
        filterAssignee={filterAssignee}
        filterPriority={filterPriority}
        swimlane={swimlane}
        onFilterAssignee={setFilterAssignee}
        onFilterPriority={setFilterPriority}
        onSwimlane={setSwimlane}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-3 p-4">
            {ISSUE_STATUSES.map(({ value, label, icon, color }) => {
              const colIssues = columnIssues(value);
              const groups    = getSwimlaneGroups(colIssues);

              return (
                <div key={value} className="flex w-72 shrink-0 flex-col gap-2">
                  {swimlane === "none" ? (
                    <KanbanColumn
                      status={value}
                      label={label}
                      icon={icon}
                      iconColor={color}
                      issues={colIssues}
                      projectKey={project.key}
                      wipLimit={WIP_LIMITS[value]}
                      onQuickCreate={(title) => handleQuickCreate(value, title)}
                      onOpenIssue={handleOpenIssue}
                    />
                  ) : (
                    <>
                      {/* Column header (shared across swimlanes) */}
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                        {(() => { const Icon = icon; return <Icon className={`size-4 shrink-0 ${color}`} />; })()}
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {colIssues.length}
                        </span>
                        {WIP_LIMITS[value] !== undefined && colIssues.length > WIP_LIMITS[value] && (
                          <span className="ml-auto text-[10px] font-medium text-destructive">
                            WIP exceeded
                          </span>
                        )}
                      </div>

                      {/* Swimlane groups */}
                      {groups.map(({ key, label: groupLabel, issues: groupIssues }) => (
                        <div key={key} className="flex flex-col rounded-xl border border-border bg-muted/40">
                          {groupLabel && (
                            <div className="border-b border-border px-3 py-1.5">
                              <span className="text-xs font-medium text-muted-foreground">{groupLabel}</span>
                              <span className="ml-1.5 text-xs text-muted-foreground/60">({groupIssues.length})</span>
                            </div>
                          )}
                          <KanbanColumn
                            status={value}
                            label=""
                            icon={icon}
                            iconColor={color}
                            issues={groupIssues}
                            projectKey={project.key}
                            onQuickCreate={(title) => handleQuickCreate(value, title)}
                            onOpenIssue={handleOpenIssue}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Drag overlay */}
          <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
            {activeIssue && (
              <KanbanCard
                issue={activeIssue}
                projectKey={project.key}
                isDragging
                onOpen={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Issue detail modal */}
      <AnimatePresence>
        {selectedIssueId && (
          isLoadingDetail || !issueDetail ? (
            <div
              key="loading"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <IssueDetailModal
              key="detail"
              issue={issueDetail}
              projectKey={project.key}
              members={members}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserImage={currentUserImage}
              onClose={handleCloseModal}
              onDeleted={handleIssueDeleted}
            />
          )
        )}
      </AnimatePresence>
    </>
  );
}
