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
import { moveIssue, createIssue } from "../../issues/actions";
import { KanbanColumn } from "../../_components/kanban-column";
import { KanbanCard } from "../../_components/kanban-card";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";
import { BoardFilterBar, type SwimlaneMode } from "../../_components/board-filter-bar";
import { SprintHeader } from "./sprint-header";
import { useRealtimeIssues } from "@/hooks/use-realtime-issues";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";
import { ReconnectBanner } from "@/components/shared/realtime-indicator";
import type { BoardIssue } from "../../_components/kanban-board";
import { getBoardColumns, type WorkflowConfig, DEFAULT_WORKFLOW_CONFIG } from "@/lib/workflow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface SprintBoardClientProps {
  project: { id: string; name: string; key: string };
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date | null;
    endDate: Date | null;
    totalIssues: number;
    doneIssues: number;
  };
  issues: BoardIssue[];
  members: Member[];
  epics?: { id: string; key: number; title: string }[];
  otherSprints: { id: string; name: string }[];
  workflowConfig?: WorkflowConfig;
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

export function SprintBoardClient({
  project,
  sprint: initialSprint,
  issues: initialIssues,
  members,
  epics = [],
  otherSprints,
  workflowConfig = DEFAULT_WORKFLOW_CONFIG,
  currentUserId,
  currentUserName,
  currentUserImage,
}: SprintBoardClientProps) {
  const [issues, setIssues]         = useState<BoardIssue[]>(initialIssues);
  const [sprint, setSprint]         = useState(initialSprint);
  const [activeIssue, setActiveIssue] = useState<BoardIssue | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail]         = useState<IssueDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // ── Filter + swimlane ─────────────────────────────────────────────────────────
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterEpic, setFilterEpic]         = useState("all");
  const [swimlane, setSwimlane]             = useState<SwimlaneMode>("none");

  // ── Real-time ─────────────────────────────────────────────────────────────────
  type ConnStatus = "connecting" | "connected" | "disconnected";
  const [connStatus, setConnStatus] = useState<ConnStatus>("connecting");
  const ctx = useWorkspaceSafe();

  useRealtimeIssues({
    workspaceId: ctx?.workspaceId,
    projectId: project.id,
    currentUserId,
    onConnected:    () => setConnStatus("connected"),
    onDisconnected: () => setConnStatus("disconnected"),
    onIssueCreated: (issue) => {
      // Only add if it belongs to this sprint (we can't know sprintId from SSE payload easily,
      // so we skip auto-add — a page refresh will show it)
    },
    onIssueUpdated: (update) => {
      setIssues((prev) => {
        const next = prev.map((i) =>
          i.id === update.id
            ? {
                ...i,
                ...(update.title      !== undefined && { title:      update.title }),
                ...(update.status     !== undefined && { status:     update.status }),
                ...(update.priority   !== undefined && { priority:   update.priority }),
                ...(update.type       !== undefined && { type:       update.type }),
                ...(update.assigneeId !== undefined && { assigneeId: update.assigneeId }),
              }
            : i,
        );
        // Update sprint stats inside the same updater to avoid stale closure
        const doneIssues = next.filter(
          (i) => i.status === "DONE" || i.status === "CANCELLED",
        ).length;
        setSprint((prev) => ({ ...prev, doneIssues }));
        return next;
      });
    },
    onIssueMoved: (update) => {
      setIssues((prev) =>
        prev.map((i) =>
          i.id === update.id
            ? { ...i, status: update.newStatus, position: update.newPosition }
            : i,
        ),
      );
    },
    onIssueDeleted: (issueId) => {
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
    },
  });

  const hasActiveFilters = filterAssignee !== "all" || filterPriority !== "all" || filterEpic !== "all" || swimlane !== "none";

  function clearFilters() {
    setFilterAssignee("all");
    setFilterPriority("all");
    setFilterEpic("all");
    setSwimlane("none");
  }

  // ── DnD ───────────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columnIssues = useCallback(
    (status: string) => {
      return issues
        .filter((i) => {
          if (i.status !== status || i.type === "SUBTASK") return false;
          if (filterAssignee === "unassigned" && i.assigneeId !== null) return false;
          if (filterAssignee !== "all" && filterAssignee !== "unassigned" && i.assigneeId !== filterAssignee) return false;
          if (filterPriority !== "all" && i.priority !== filterPriority) return false;
          if (filterEpic === "none" && i.epicId) return false;
          if (filterEpic !== "all" && filterEpic !== "none" && i.epicId !== filterEpic) return false;
          return true;
        })
        .sort((a, b) => a.position - b.position);
    },
    [issues, filterAssignee, filterPriority, filterEpic],
  );

  function getSwimlaneGroups(colIssues: BoardIssue[]) {
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

  function handleDragStart({ active }: DragStartEvent) {
    setActiveIssue(issues.find((i) => i.id === active.id) ?? null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    const activeData = issues.find((i) => i.id === active.id);
    if (!activeData) return;
    const overStatus = (over.data.current?.status ?? over.id) as string;
    if (activeData.status !== overStatus) {
      setIssues((prev) =>
        prev.map((i) => i.id === active.id ? { ...i, status: overStatus } : i),
      );
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveIssue(null);
    if (!over) return;
    const activeData = issues.find((i) => i.id === active.id);
    if (!activeData) return;
    const targetStatus = (over.data.current?.status ?? over.id) as string;
    const overIndex    = over.data.current?.sortable?.index ?? columnIssues(targetStatus).length;
    const newPosition  = computeNewPosition(
      issues.filter((i) => i.status === targetStatus),
      overIndex,
      active.id as string,
    );
    setIssues((prev) => {
      const next = prev.map((i) =>
        i.id === active.id ? { ...i, status: targetStatus, position: newPosition } : i,
      );
      // Update sprint done count inside the same updater — avoids stale closure
      const doneIssues = next.filter(
        (i) => i.status === "DONE" || i.status === "CANCELLED",
      ).length;
      setSprint((prev) => ({ ...prev, doneIssues }));
      return next;
    });
    moveIssue(active.id as string, targetStatus as never, newPosition).catch(() => {
      window.location.reload();
    });
  }

  async function handleQuickCreate(status: string, title: string) {
    const result = await createIssue({
      projectId: project.id,
      title,
      status: status as never,
    });
    if (result.success && result.data) {
      const colIssues = columnIssues(status);
      const position  = colIssues.length > 0
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
      setSprint((prev) => ({ ...prev, totalIssues: prev.totalIssues + 1 }));
    }
  }

  async function handleOpenIssue(issueId: string) {
    setSelectedIssueId(issueId);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) setIssueDetail(await res.json());
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function handleCloseModal() { setSelectedIssueId(null); setIssueDetail(null); }

  function handleIssueDeleted() {
    if (selectedIssueId) {
      setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
      setSprint((prev) => ({
        ...prev,
        totalIssues: Math.max(0, prev.totalIssues - 1),
      }));
    }
    handleCloseModal();
  }

  function handleSprintCompleted() {
    window.location.reload();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <ReconnectBanner show={connStatus === "disconnected"} />

      {/* Sprint header with progress */}
      <SprintHeader
        sprint={sprint}
        otherSprints={otherSprints}
        onCompleted={handleSprintCompleted}
      />

      {/* Filter bar */}
      <BoardFilterBar
        members={members}
        epics={epics}
        filterAssignee={filterAssignee}
        filterPriority={filterPriority}
        filterEpic={filterEpic}
        swimlane={swimlane}
        onFilterAssignee={setFilterAssignee}
        onFilterPriority={setFilterPriority}
        onFilterEpic={setFilterEpic}
        onSwimlane={setSwimlane}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
        realtimeStatus={connStatus}
        projectKey={project.key}
      />

      {/* Board */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-3 p-4">
            {getBoardColumns(workflowConfig).map(({ value, label, icon, color }) => {
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
                      onQuickCreate={(title) => handleQuickCreate(value, title)}
                      onOpenIssue={handleOpenIssue}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
                        {(() => { const Icon = icon; return <Icon className={`size-4 shrink-0 ${color}`} />; })()}
                        <span className="text-sm font-semibold text-foreground">{label}</span>
                        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {colIssues.length}
                        </span>
                      </div>
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
