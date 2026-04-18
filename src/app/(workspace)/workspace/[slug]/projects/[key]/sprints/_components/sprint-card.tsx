"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play, CheckCircle2, Trash2, ChevronDown, ChevronRight,
  Calendar, Target, Loader2, XCircle, Plus, X, Zap, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPriorityConfig, getStatusConfig, getTypeConfig } from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { startSprint, deleteSprint, addIssueToSprint, removeIssueFromSprint } from "../actions";
import { CreateSprintDialog } from "./create-sprint-dialog";
import { CompleteSprintDialog } from "./complete-sprint-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SprintIssue {
  id: string;
  key: number;
  title: string;
  type: string;
  status: string;
  priority: string;
  estimate?: number | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

export interface SprintData {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  issues: SprintIssue[];
}

interface SprintCardProps {
  sprint: SprintData;
  projectId: string;
  projectKey: string;
  workspaceSlug: string;
  otherSprints: { id: string; name: string }[];
  backlogIssues: SprintIssue[];
  index: number;
  onUpdated: () => void;
  onDeleted: (sprintId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED:   "bg-muted text-muted-foreground",
  ACTIVE:    "bg-primary/10 text-primary",
  COMPLETED: "bg-muted text-muted-foreground",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SprintCard({
  sprint: initialSprint,
  projectId,
  projectKey,
  workspaceSlug,
  otherSprints,
  backlogIssues,
  index,
  onUpdated,
  onDeleted,
}: SprintCardProps) {
  const [sprint, setSprint] = useState(initialSprint);
  const [isExpanded, setIsExpanded] = useState(sprint.status === "ACTIVE");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const incompleteCount = sprint.issues.filter(
    (i) => i.status !== "DONE" && i.status !== "CANCELLED",
  ).length;

  const doneCount = sprint.issues.filter((i) => i.status === "DONE").length;
  const progress = sprint.issues.length > 0
    ? Math.round((doneCount / sprint.issues.length) * 100)
    : 0;

  // Story points
  const totalPoints = sprint.issues.reduce((sum, i) => sum + (i.estimate ?? 0), 0);
  const donePoints  = sprint.issues
    .filter((i) => i.status === "DONE" || i.status === "CANCELLED")
    .reduce((sum, i) => sum + (i.estimate ?? 0), 0);

  // ── Start sprint ─────────────────────────────────────────────────────────────

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startSprint(sprint.id);
      if (!result.success) { setError(result.error ?? "Failed to start sprint."); return; }
      setSprint((prev) => ({ ...prev, status: "ACTIVE" }));
      setIsExpanded(true);
      onUpdated();
    });
  }

  // ── Delete sprint ─────────────────────────────────────────────────────────────

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSprint(sprint.id);
      if (!result.success) { setError(result.error ?? "Failed to delete sprint."); return; }
      onDeleted(sprint.id);
    });
  }

  // ── Add issue to sprint ───────────────────────────────────────────────────────

  function handleAddIssue(issueId: string) {
    startTransition(async () => {
      const result = await addIssueToSprint(issueId, sprint.id);
      if (!result.success) { setError(result.error ?? "Failed to add issue."); return; }
      const issue = backlogIssues.find((i) => i.id === issueId);
      if (issue) setSprint((prev) => ({ ...prev, issues: [...prev.issues, issue] }));
      onUpdated();
    });
  }

  // ── Remove issue from sprint ──────────────────────────────────────────────────

  function handleRemoveIssue(issueId: string) {
    startTransition(async () => {
      const result = await removeIssueFromSprint(issueId);
      if (!result.success) { setError(result.error ?? "Failed to remove issue."); return; }
      setSprint((prev) => ({ ...prev, issues: prev.issues.filter((i) => i.id !== issueId) }));
      onUpdated();
    });
  }

  // ── Available backlog issues (not already in this sprint) ─────────────────────

  const sprintIssueIds = new Set(sprint.issues.map((i) => i.id));
  const availableBacklog = backlogIssues.filter((i) => !sprintIssueIds.has(i.id));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Sprint header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Expand toggle */}
        <button
          onClick={() => setIsExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isExpanded ? "Collapse sprint" : "Expand sprint"}
        >
          {isExpanded
            ? <ChevronDown className="size-4" />
            : <ChevronRight className="size-4" />
          }
        </button>

        {/* Sprint name + status */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          <span className="font-semibold text-foreground truncate">{sprint.name}</span>
          <Badge className={cn("text-xs shrink-0", STATUS_COLORS[sprint.status])}>
            {sprint.status === "IN_PROGRESS" ? "Active" : sprint.status.charAt(0) + sprint.status.slice(1).toLowerCase()}
          </Badge>
        </div>

        {/* Dates */}
        {(sprint.startDate || sprint.endDate) && (
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <Calendar className="size-3.5" />
            {formatDate(sprint.startDate)} – {formatDate(sprint.endDate) ?? "No end date"}
          </div>
        )}

        {/* Issue count + progress + points */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{sprint.issues.length} {sprint.issues.length === 1 ? "issue" : "issues"}</span>
          {sprint.issues.length > 0 && (
            <span className="text-primary font-medium">{progress}%</span>
          )}
          {totalPoints > 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Zap className="size-2.5" />
              {donePoints}/{totalPoints} pts
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {sprint.status === "PLANNED" && (
            <Button size="sm" className="h-7 px-2.5 text-xs" onClick={handleStart} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Play className="mr-1 size-3.5" />Start</>}
            </Button>
          )}

          {sprint.status === "ACTIVE" && (
            <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setShowCompleteDialog(true)} disabled={isPending}>
              <CheckCircle2 className="mr-1 size-3.5" />Complete
            </Button>
          )}

          {sprint.status === "COMPLETED" && (
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" asChild>
              <Link href={`/workspace/${workspaceSlug}/projects/${projectKey}/sprints/${sprint.id}/report`}>
                <BarChart3 className="size-3.5" />
                View report
              </Link>
            </Button>
          )}

          {sprint.status !== "COMPLETED" && (
            <CreateSprintDialog
              projectId={projectId}
              sprint={{ id: sprint.id, name: sprint.name, goal: sprint.goal, startDate: sprint.startDate, endDate: sprint.endDate }}
              trigger={
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                  <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z"/></svg>
                </Button>
              }
              onSuccess={() => onUpdated()}
            />
          )}

          {sprint.status === "PLANNED" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete sprint</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete <strong>{sprint.name}</strong> and move all its issues back to the backlog.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete sprint"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {sprint.issues.length > 0 && (
        <div className="h-0.5 w-full bg-border">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Sprint goal */}
      {sprint.goal && isExpanded && (
        <div className="flex items-start gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
          <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{sprint.goal}</p>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 border-t border-border bg-destructive/5 px-4 py-2 text-sm text-destructive">
            <XCircle className="size-4 shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="size-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Issue list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-border">
              {sprint.issues.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted-foreground">
                  No issues in this sprint yet.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {sprint.issues.map((issue) => {
                    const priority = getPriorityConfig(issue.priority);
                    const status   = getStatusConfig(issue.status);
                    const type     = getTypeConfig(issue.type);
                    const PriorityIcon = priority.icon;
                    const StatusIcon   = status.icon;
                    const TypeIcon     = type.icon;

                    return (
                      <div key={issue.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                        <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                        <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
                        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{projectKey}-{issue.key}</span>
                        <span className="flex-1 truncate text-sm text-foreground">{issue.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusIcon className={cn("size-3.5", status.color)} />
                          <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
                        </div>
                        {issue.assignee && (
                          <Avatar className="size-5 shrink-0">
                            <AvatarImage src={issue.assignee.image ?? undefined} />
                            <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
                          </Avatar>
                        )}
                        {issue.estimate != null && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            <Zap className="size-2.5" />{issue.estimate}
                          </span>
                        )}
                        {sprint.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleRemoveIssue(issue.id)}
                            disabled={isPending}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            aria-label="Remove from sprint"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add issue from backlog */}
              {sprint.status !== "COMPLETED" && (
                <div className="border-t border-border px-4 py-2">
                  {showAddIssue && availableBacklog.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {availableBacklog.map((issue) => (
                        <button
                          key={issue.id}
                          onClick={() => { handleAddIssue(issue.id); setShowAddIssue(false); }}
                          disabled={isPending}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors disabled:opacity-50"
                        >
                          <span className="font-mono text-xs text-muted-foreground">{projectKey}-{issue.key}</span>
                          <span className="flex-1 truncate text-foreground">{issue.title}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <button
                    onClick={() => setShowAddIssue((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    <Plus className="size-3.5" />
                    {showAddIssue ? "Cancel" : "Add issue"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete sprint dialog */}
      <CompleteSprintDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        sprintId={sprint.id}
        sprintName={sprint.name}
        incompleteCount={incompleteCount}
        otherSprints={otherSprints.filter((s) => s.id !== sprint.id)}
        onCompleted={() => {
          setSprint((prev) => ({ ...prev, status: "COMPLETED" }));
          onUpdated();
        }}
      />
    </motion.div>
  );
}
