"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { MessageSquare, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import { isOverdue } from "@/lib/due-date";
import { cn } from "@/lib/utils";
import type { BoardIssue } from "./kanban-board";

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  issue: BoardIssue;
  projectKey: string;
  isDragging?: boolean;
  onOpen: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanCard({ issue, projectKey, isDragging = false, onOpen }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: issue.id,
    data: { status: issue.status, sortable: { index: 0 } },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;

  const isGhost   = isSortableDragging && !isDragging;
  const overdue   = isOverdue(issue.dueDate, issue.status);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: isGhost ? 0.3 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm",
        "hover:border-primary/40 hover:shadow-md transition-all",
        isDragging && "rotate-1 shadow-xl ring-2 ring-primary/30",
        isGhost && "pointer-events-none",
        overdue && "border-destructive/40",
      )}
    >
      {/* Top row: type icon + key + priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {projectKey}-{issue.key}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {overdue && (
            <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              <CalendarDays className="size-2.5" />
              Overdue
            </span>
          )}
          <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
        </div>
      </div>

      {/* Title */}
      <p className="mb-3 line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
        {issue.title}
      </p>

      {/* Bottom row: comment count + assignee */}
      <div className="flex items-center justify-between">
        {issue.commentCount > 0 ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3" />
            {issue.commentCount}
          </div>
        ) : (
          <span />
        )}

        {issue.assignee ? (
          <Avatar className="size-5">
            <AvatarImage src={issue.assignee.image ?? undefined} alt={issue.assignee.name} />
            <AvatarFallback className="text-[9px] font-semibold">
              {getInitials(issue.assignee.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-5 rounded-full border border-dashed border-border" />
        )}
      </div>
    </motion.div>
  );
}
