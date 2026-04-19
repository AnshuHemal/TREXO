"use client";

import { useState, useTransition } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, CalendarDays, ShieldAlert, Clock,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPriorityConfig, getTypeConfig, getStatusConfig,
  ISSUE_STATUSES, ISSUE_PRIORITIES,
} from "@/lib/issue-config";
import { isOverdue, isDueThisWeek, getDueDateLabel, getAgingLevel, getAgingLabel } from "@/lib/due-date";
import { LabelBadge } from "@/components/shared/label-picker";
import { cn } from "@/lib/utils";
import { updateIssue } from "../issues/actions";
import type { BoardIssue } from "./kanban-board";

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanCardProps {
  issue: BoardIssue;
  projectKey: string;
  isDragging?: boolean;
  onOpen: () => void;
  /** Members list for assignee quick-edit */
  members?: { id: string; name: string; image: string | null }[];
  /** Called when a field is updated inline */
  onUpdated?: (id: string, field: string, value: string | null) => void;
  /** Whether this card is keyboard-focused */
  isFocused?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Quick-edit dropdown ──────────────────────────────────────────────────────

function QuickEditDropdown<T extends string>({
  options,
  currentValue,
  onSelect,
  trigger,
}: {
  options: { value: T; label: string; icon?: React.ElementType; color?: string }[];
  currentValue: T;
  onSelect: (value: T) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] transition-colors hover:bg-accent"
      >
        {trigger}
        <ChevronDown className="size-2.5 text-muted-foreground/60" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute left-0 top-full z-50 mt-1 min-w-[130px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            >
              <div className="p-1">
                {options.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(value); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                      value === currentValue && "bg-primary/10 text-primary",
                    )}
                  >
                    {Icon && <Icon className={cn("size-3.5 shrink-0", color)} />}
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Assignee quick-edit ──────────────────────────────────────────────────────

function AssigneeQuickEdit({
  issue,
  members = [],
  onSelect,
}: {
  issue: BoardIssue;
  members: { id: string; name: string; image: string | null }[];
  onSelect: (memberId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-0.5 rounded transition-colors hover:ring-2 hover:ring-primary/30"
        title="Change assignee"
      >
        {issue.assignee ? (
          <Avatar className="size-5">
            <AvatarImage src={issue.assignee.image ?? undefined} />
            <AvatarFallback className="text-[9px] font-semibold">
              {getInitials(issue.assignee.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-5 rounded-full border border-dashed border-border hover:border-primary/50" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            >
              <div className="border-b border-border px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assign to
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto p-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelect(null); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
                >
                  <div className="size-5 rounded-full border border-dashed border-border" />
                  <span className="text-muted-foreground">Unassigned</span>
                </button>
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(m.id); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-accent",
                      issue.assigneeId === m.id && "bg-primary/10 text-primary",
                    )}
                  >
                    <Avatar className="size-5 shrink-0">
                      <AvatarImage src={m.image ?? undefined} />
                      <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{m.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function KanbanCard({
  issue: initialIssue,
  projectKey,
  isDragging = false,
  onOpen,
  members = [],
  onUpdated,
  isFocused = false,
}: KanbanCardProps) {
  const [issue, setIssue] = useState(initialIssue);
  const [isHovered, setIsHovered] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  const priority    = getPriorityConfig(issue.priority);
  const type        = getTypeConfig(issue.type);
  const statusCfg   = getStatusConfig(issue.status);
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;
  const StatusIcon   = statusCfg.icon;

  const isGhost      = isSortableDragging && !isDragging;
  const overdue      = isOverdue(issue.dueDate, issue.status);
  const dueSoon      = !overdue && isDueThisWeek(issue.dueDate, issue.status);
  const dueDateLabel = getDueDateLabel(issue.dueDate, issue.status);
  const agingLevel   = getAgingLevel(issue.statusChangedAt, issue.status);
  const agingLabel   = getAgingLabel(issue.statusChangedAt, issue.status);

  const priorityBorderColor =
    issue.priority === "URGENT" ? "border-l-destructive"
    : issue.priority === "HIGH" ? "border-l-orange-500"
    : issue.priority === "MEDIUM" ? "border-l-yellow-500"
    : issue.priority === "LOW" ? "border-l-primary"
    : "border-l-transparent";

  // ── Inline field update ───────────────────────────────────────────────────
  function handleFieldUpdate(field: string, value: string | null) {
    const updated = { ...issue, [field]: value };
    if (field === "assigneeId") {
      updated.assignee = value ? (members.find((m) => m.id === value) ?? null) : null;
    }
    setIssue(updated);
    onUpdated?.(issue.id, field, value);

    startTransition(async () => {
      await updateIssue(issue.id, { [field]: value } as never);
    });
  }

  const showQuickEdit = (isHovered || isFocused) && !isDragging && !isGhost;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative cursor-pointer rounded-lg border border-l-4 border-border bg-card p-3 shadow-sm",
        "hover:border-primary/40 hover:shadow-md transition-all",
        isDragging && "rotate-1 shadow-xl ring-2 ring-primary/30",
        isGhost && "pointer-events-none",
        isFocused && "ring-2 ring-primary/50 ring-offset-1",
        issue.isBlocked
          ? "border-l-destructive bg-destructive/2"
          : overdue
            ? "border-l-destructive bg-destructive/2"
            : dueSoon
              ? "border-l-amber-500"
              : agingLevel === "critical"
                ? "border-l-red-500 bg-red-500/3"
                : agingLevel === "warn"
                  ? "border-l-amber-500 bg-amber-500/3"
                  : priorityBorderColor,
      )}
    >
      {/* Epic badge */}
      {issue.epicTitle && (
        <div className="mb-2 flex items-center gap-1">
          <span className="truncate rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
            {issue.epicTitle}
          </span>
        </div>
      )}

      {/* Top row: type + key + priority */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
          <span className="font-mono text-[11px] text-muted-foreground">
            {projectKey}-{issue.key}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {overdue && (
            <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
              <CalendarDays className="size-2.5" />
              {dueDateLabel ?? "Overdue"}
            </span>
          )}
          {!overdue && dueSoon && dueDateLabel && (
            <span className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <CalendarDays className="size-2.5" />
              {dueDateLabel}
            </span>
          )}
          {issue.isBlocked && (
            <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              <ShieldAlert className="size-2.5" />
              Blocked
            </span>
          )}
          <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
        </div>
      </div>

      {/* Title */}
      <p className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">
        {issue.title}
      </p>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1">
          {issue.labels.slice(0, 3).map((label) => (
            <LabelBadge key={label.id} label={label} size="xs" />
          ))}
          {issue.labels.length > 3 && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              +{issue.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: aging + comments + assignee */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          {agingLevel !== "none" && agingLabel && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                agingLevel === "critical"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}
              title={`In ${issue.status.replace("_", " ").toLowerCase()} for ${agingLabel}`}
            >
              <Clock className="size-2.5" />
              {agingLabel}
            </motion.span>
          )}
          {issue.commentCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3" />
              {issue.commentCount}
            </div>
          )}
        </div>

        {/* Assignee — quick-edit on hover */}
        <div onClick={(e) => e.stopPropagation()}>
          <AssigneeQuickEdit
            issue={issue}
            members={members}
            onSelect={(memberId) => handleFieldUpdate("assigneeId", memberId)}
          />
        </div>
      </div>

      {/* ── Quick-edit toolbar (hover/focus) ─────────────────────────────── */}
      <AnimatePresence>
        {showQuickEdit && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            onClick={(e) => e.stopPropagation()}
            className="mt-2.5 flex items-center gap-1 border-t border-border/60 pt-2"
          >
            {/* Status quick-edit */}
            <QuickEditDropdown
              options={ISSUE_STATUSES.map(({ value, label, icon, color }) => ({
                value, label, icon, color,
              }))}
              currentValue={issue.status}
              onSelect={(v) => handleFieldUpdate("status", v)}
              trigger={
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <StatusIcon className={cn("size-3", statusCfg.color)} />
                  {statusCfg.label}
                </span>
              }
            />

            <span className="text-border">·</span>

            {/* Priority quick-edit */}
            <QuickEditDropdown
              options={ISSUE_PRIORITIES.map(({ value, label, icon, color }) => ({
                value, label, icon, color,
              }))}
              currentValue={issue.priority}
              onSelect={(v) => handleFieldUpdate("priority", v)}
              trigger={
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <PriorityIcon className={cn("size-3", priority.color)} />
                  {priority.label}
                </span>
              }
            />

            {isPending && (
              <span className="ml-auto text-[10px] text-muted-foreground/60 animate-pulse">
                Saving…
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
