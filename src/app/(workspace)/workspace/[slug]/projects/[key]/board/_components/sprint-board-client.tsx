"use client";

import { useState, useCallback, useTransition } from "react";
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
import { AnimatePresence, motion } from "motion/react";
import {
  X, Loader2, Trash2, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ISSUE_STATUSES, ISSUE_PRIORITIES, getPriorityConfig } from "@/lib/issue-config";
import { moveIssue, createIssue, bulkUpdateIssues, bulkDeleteIssues } from "../../issues/actions";
import { KanbanColumn } from "../../_components/kanban-column";
import { KanbanCard } from "../../_components/kanban-card";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";
import { BoardFilterBar, type SwimlaneMode } from "../../_components/board-filter-bar";
import { SprintHeader } from "./sprint-header";
import { CapacityPanel } from "./capacity-panel";
import { useRealtimeIssues } from "@/hooks/use-realtime-issues";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";
import { ReconnectBanner } from "@/components/shared/realtime-indicator";
import type { BoardIssue } from "../../_components/kanban-board";
import { getBoardColumns, type WorkflowConfig, DEFAULT_WORKFLOW_CONFIG } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import { useKanbanKeyboard } from "@/hooks/use-kanban-keyboard";

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
  allLabels?: { id: string; name: string; color: string }[];
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
  allLabels = [],
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

  // ── Bulk selection ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();

  function handleCardSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function clearSelection() { setSelectedIds(new Set()); }

  function handleBulkUpdate(field: string, value: string | null) {
    startBulkTransition(async () => {
      const result = await bulkUpdateIssues({
        issueIds: Array.from(selectedIds),
        ...(field === "status"     && { status:     value as never }),
        ...(field === "priority"   && { priority:   value as never }),
        ...(field === "assigneeId" && { assigneeId: value }),
      });
      if (result.success) {
        setIssues((prev) => prev.map((i) =>
          selectedIds.has(i.id)
            ? {
                ...i,
                ...(field === "status"     && { status:     value as string }),
                ...(field === "priority"   && { priority:   value as string }),
                ...(field === "assigneeId" && {
                  assigneeId: value,
                  assignee: value ? (members.find((m) => m.id === value) ?? null) : null,
                }),
              }
            : i,
        ));
        clearSelection();
      }
    });
  }

  function handleBulkDelete() {
    startBulkTransition(async () => {
      const ids = Array.from(selectedIds);
      const result = await bulkDeleteIssues(ids);
      if (result.success) {
        setIssues((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSprint((prev) => ({
          ...prev,
          totalIssues: Math.max(0, prev.totalIssues - ids.length),
        }));
        clearSelection();
      }
    });
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────────
  const allIssueIds = issues
    .filter((i) => i.type !== "SUBTASK")
    .map((i) => i.id);

  const { focusedId, setFocusedId } = useKanbanKeyboard({
    issueIds: allIssueIds,
    onOpen: handleOpenIssue,
    enabled: !selectedIssueId, // disable when modal is open
  });

  // ── Inline issue update (from quick-edit) ─────────────────────────────────────
  function handleIssueUpdated(id: string, field: string, value: string | null) {
    setIssues((prev) => prev.map((i) => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      if (field === "assigneeId") {
        updated.assignee = value ? (members.find((m) => m.id === value) ?? null) : null;
      }
      return updated;
    }));
    // Update sprint done count if status changed
    if (field === "status") {
      const next = issues.map((i) => i.id === id ? { ...i, status: value ?? i.status } : i);
      const doneIssues = next.filter((i) => i.status === "DONE" || i.status === "CANCELLED").length;
      setSprint((prev) => ({ ...prev, doneIssues }));
    }
  }
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterEpic, setFilterEpic]         = useState("all");
  const [swimlane, setSwimlane]             = useState<SwimlaneMode>("none");

  // ── Filter + swimlane ─────────────────────────────────────────────────────────
  const [filterAssignee, setFilterAssignee] = useState("all");

  // ── Capacity panel ────────────────────────────────────────────────────────────
  const [showCapacity, setShowCapacity] = useState(false);

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
    setFocusedId(issueId);
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
        showCapacity={showCapacity}
        onToggleCapacity={() => setShowCapacity((v) => !v)}
      />

      {/* Board + capacity panel */}
      <div className="flex flex-1 overflow-hidden">
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
                      members={members}
                      onIssueUpdated={handleIssueUpdated}
                      focusedIssueId={focusedId}
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
                            members={members}
                            onIssueUpdated={handleIssueUpdated}
                            focusedIssueId={focusedId}
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

        {/* Capacity panel */}
        <AnimatePresence>
          {showCapacity && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
              className="overflow-hidden"
            >
              <CapacityPanel issues={issues} members={members} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>{/* end board + capacity row */}

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-card px-4 py-2.5 shadow-2xl shadow-primary/10">
              {/* Count */}
              <div className="flex items-center gap-2">
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                  {selectedIds.size}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size === 1 ? "issue" : "issues"} selected
                </span>
              </div>
              <div className="h-4 w-px bg-border" />

              {/* Status */}
              <Select onValueChange={(v) => handleBulkUpdate("status", v)} disabled={isBulkPending}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Set status" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2 text-xs"><Icon className={cn("size-3.5", color)} />{label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Priority */}
              <Select onValueChange={(v) => handleBulkUpdate("priority", v)} disabled={isBulkPending}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Set priority" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2 text-xs"><Icon className={cn("size-3.5", color)} />{label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Assignee */}
              <Select onValueChange={(v) => handleBulkUpdate("assigneeId", v === "none" ? null : v)} disabled={isBulkPending}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none"><span className="text-xs text-muted-foreground">Unassigned</span></SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2 text-xs">
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[8px]">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isBulkPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

              <div className="flex items-center gap-1.5">
                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm"
                      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isBulkPending}>
                      <Trash2 className="size-3.5" />Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selectedIds.size} {selectedIds.size === 1 ? "issue" : "issues"}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the selected issues. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkPending}>
                        Delete {selectedIds.size} {selectedIds.size === 1 ? "issue" : "issues"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Clear */}
                <Button variant="ghost" size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearSelection}>
                  <X className="size-3.5" />Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              allLabels={allLabels}
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
