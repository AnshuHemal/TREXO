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
import { ISSUE_STATUSES } from "@/lib/issue-config";
import { moveIssue, createIssue } from "../issues/actions";
import { KanbanColumn } from "./kanban-column";
import { KanbanCard } from "./kanban-card";
import { IssueDetailModal, type IssueDetail } from "../issues/_components/issue-detail-modal";

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

  // ── DnD sensors ──────────────────────────────────────────────────────────────
  // PointerSensor with a 5px activation distance prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // ── Issues grouped by status — exclude sub-tasks from the board ──────────────
  const columnIssues = useCallback(
    (status: string) =>
      issues
        .filter((i) => i.status === status && i.type !== "SUBTASK")
        .sort((a, b) => a.position - b.position),
    [issues],
  );

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
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full gap-3 p-4">
            {ISSUE_STATUSES.map(({ value, label, icon, color }) => (
              <KanbanColumn
                key={value}
                status={value}
                label={label}
                icon={icon}
                iconColor={color}
                issues={columnIssues(value)}
                projectKey={project.key}
                onQuickCreate={(title) => handleQuickCreate(value, title)}
                onOpenIssue={handleOpenIssue}
              />
            ))}
          </div>

          {/* Drag overlay — the card that follows the cursor */}
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
