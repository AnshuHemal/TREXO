"use client";

import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardIssue } from "./kanban-board";
import { KanbanCard } from "./kanban-card";

// ─── Props ────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  issues: BoardIssue[];
  projectKey: string;
  wipLimit?: number;
  onQuickCreate: (title: string) => void;
  onOpenIssue: (issueId: string) => void;
  /** Members for assignee quick-edit */
  members?: { id: string; name: string; image: string | null }[];
  /** Called when a field is updated inline */
  onIssueUpdated?: (id: string, field: string, value: string | null) => void;
  /** Currently keyboard-focused issue ID */
  focusedIssueId?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KanbanColumn({
  status,
  label,
  icon: Icon,
  iconColor,
  issues,
  projectKey,
  wipLimit,
  onQuickCreate,
  onOpenIssue,
  members = [],
  onIssueUpdated,
  focusedIssueId,
}: KanbanColumnProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Make the column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  function handleStartCreate() {
    setIsCreating(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleCancelCreate() {
    setIsCreating(false);
    setNewTitle("");
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) { handleCancelCreate(); return; }
    onQuickCreate(title);
    setNewTitle("");
    setIsCreating(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancelCreate();
  }

  const isWipExceeded = wipLimit !== undefined && issues.length > wipLimit;

  return (
    <div className={cn(
      "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40",
      isWipExceeded ? "border-destructive/50" : "border-border",
    )}>

      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <Icon className={cn("size-4 shrink-0", iconColor)} />
          <span className="text-sm font-semibold text-foreground">{label}</span>
          <span className={cn(
            "flex size-5 items-center justify-center rounded-full text-xs font-medium",
            isWipExceeded
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}>
            {issues.length}
          </span>
          {wipLimit !== undefined && (
            <span className="text-[10px] text-muted-foreground">/{wipLimit}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={handleStartCreate}
          aria-label={`Add issue to ${label}`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* WIP limit warning */}
      {isWipExceeded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mx-2 mb-2 flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive"
        >
          <span className="font-medium">WIP limit exceeded</span>
          <span className="text-destructive/70">({issues.length}/{wipLimit})</span>
        </motion.div>
      )}

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors",
          isOver && "bg-primary/5",
        )}
        style={{ minHeight: "4rem" }}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {issues.map((issue) => (
              <KanbanCard
                key={issue.id}
                issue={issue}
                projectKey={projectKey}
                onOpen={() => onOpenIssue(issue.id)}
                members={members}
                onUpdated={onIssueUpdated}
                isFocused={focusedIssueId === issue.id}
              />
            ))}
          </AnimatePresence>
        </SortableContext>

        {/* Quick-create input */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <form
                onSubmit={handleCreateSubmit}
                className="rounded-lg border border-primary/40 bg-card p-2 shadow-sm"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Issue title…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <div className="mt-2 flex items-center gap-1.5">
                  <Button type="submit" size="sm" className="h-6 px-2 text-xs" disabled={!newTitle.trim()}>
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={handleCancelCreate}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add issue button at bottom (when not creating) */}
      {!isCreating && (
        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 rounded-b-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" />
          Add issue
        </button>
      )}
    </div>
  );
}
