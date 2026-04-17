"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Check, X, Loader2, GitBranch, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStatusConfig, getPriorityConfig } from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { createSubTask, updateIssue } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubTaskItem {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface SubTaskListProps {
  parentId: string;
  projectId: string;
  projectKey: string;
  subTasks: SubTaskItem[];
  onOpenSubTask: (id: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function SubTaskProgress({ subTasks }: { subTasks: SubTaskItem[] }) {
  if (subTasks.length === 0) return null;

  const done  = subTasks.filter((s) => s.status === "DONE" || s.status === "CANCELLED").length;
  const total = subTasks.length;
  const pct   = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 overflow-hidden rounded-full bg-border h-1.5">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Sub-task row ─────────────────────────────────────────────────────────────

function SubTaskRow({
  subTask,
  projectKey,
  index,
  onOpen,
  onStatusToggle,
}: {
  subTask: SubTaskItem;
  projectKey: string;
  index: number;
  onOpen: () => void;
  onStatusToggle: (id: string, currentStatus: string) => void;
}) {
  const status   = getStatusConfig(subTask.status);
  const priority = getPriorityConfig(subTask.priority);
  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;

  const isDone = subTask.status === "DONE" || subTask.status === "CANCELLED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="group flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/30 hover:bg-accent/20 transition-colors"
    >
      {/* Status toggle checkbox */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onStatusToggle(subTask.id, subTask.status); }}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all",
          isDone
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary",
        )}
        aria-label={isDone ? "Mark incomplete" : "Mark done"}
      >
        {isDone && <Check className="size-2.5" strokeWidth={3} />}
      </button>

      {/* Priority */}
      <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />

      {/* Key */}
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {projectKey}-{subTask.key}
      </span>

      {/* Title — clickable to open detail */}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex-1 truncate text-left text-sm transition-colors hover:text-primary",
          isDone ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {subTask.title}
      </button>

      {/* Status */}
      <div className="hidden shrink-0 items-center gap-1 sm:flex">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="text-xs text-muted-foreground">{status.label}</span>
      </div>

      {/* Assignee */}
      <div className="shrink-0">
        {subTask.assignee ? (
          <Avatar className="size-5">
            <AvatarImage src={subTask.assignee.image ?? undefined} />
            <AvatarFallback className="text-[9px]">{getInitials(subTask.assignee.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-5 rounded-full border border-dashed border-border" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SubTaskList({
  parentId,
  projectId,
  projectKey,
  subTasks: initialSubTasks,
  onOpenSubTask,
}: SubTaskListProps) {
  const [subTasks, setSubTasks]   = useState(initialSubTasks);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle]   = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newTitle.trim()) { setIsCreating(false); return; }
    setError(null);
    startTransition(async () => {
      const result = await createSubTask({ parentId, projectId, title: newTitle });
      if (!result.success) {
        setError(result.fieldErrors?.title ?? result.error ?? "Failed to create.");
        return;
      }
      setSubTasks((prev) => [
        ...prev,
        {
          id: result.data!.id,
          key: result.data!.key,
          title: newTitle.trim(),
          status: "BACKLOG",
          priority: "MEDIUM",
          assignee: null,
        },
      ]);
      setNewTitle("");
      setIsCreating(false);
    });
  }

  function handleStatusToggle(id: string, currentStatus: string) {
    const newStatus = (currentStatus === "DONE" || currentStatus === "CANCELLED")
      ? "TODO"
      : "DONE";

    // Optimistic update
    setSubTasks((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: newStatus } : s),
    );

    startTransition(async () => {
      const result = await updateIssue(id, { status: newStatus as never });
      if (!result.success) {
        // Revert on failure
        setSubTasks((prev) =>
          prev.map((s) => s.id === id ? { ...s, status: currentStatus } : s),
        );
      }
    });
  }

  const doneCount  = subTasks.filter((s) => s.status === "DONE" || s.status === "CANCELLED").length;
  const totalCount = subTasks.length;

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <GitBranch className="size-4" />
          Sub-tasks
          {totalCount > 0 && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({doneCount}/{totalCount})
            </span>
          )}
          <motion.span
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
            className="text-muted-foreground"
          >
            <ChevronDown className="size-3.5" />
          </motion.span>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setIsCreating(true); setIsExpanded(true); }}
        >
          <Plus className="size-3.5" />
          Add sub-task
        </Button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && <SubTaskProgress subTasks={subTasks} />}

      {/* Sub-task list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {subTasks.map((st, i) => (
                <SubTaskRow
                  key={st.id}
                  subTask={st}
                  projectKey={projectKey}
                  index={i}
                  onOpen={() => onOpenSubTask(st.id)}
                  onStatusToggle={handleStatusToggle}
                />
              ))}
            </AnimatePresence>

            {/* Inline create */}
            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-background px-3 py-2">
                    <GitBranch className="size-3.5 shrink-0 text-muted-foreground" />
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreate();
                        if (e.key === "Escape") { setIsCreating(false); setNewTitle(""); }
                      }}
                      placeholder="Sub-task title…"
                      autoFocus
                      disabled={isPending}
                      className="h-6 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        className="size-6"
                        disabled={!newTitle.trim() || isPending}
                        onClick={handleCreate}
                      >
                        {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => { setIsCreating(false); setNewTitle(""); }}
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  </div>
                  {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {subTasks.length === 0 && !isCreating && (
              <p className="text-xs text-muted-foreground">
                No sub-tasks yet.{" "}
                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Add one
                </button>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
