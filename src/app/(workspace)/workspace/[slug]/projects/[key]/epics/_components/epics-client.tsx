"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Plus, ChevronRight, Search,
  MessageSquare, CalendarDays, ExternalLink, Loader2,
  MoreHorizontal, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  getStatusConfig, getPriorityConfig, getTypeConfig,
  ISSUE_STATUSES, ISSUE_PRIORITIES,
} from "@/lib/issue-config";
import { FadeIn } from "@/components/motion/fade-in";
import { CreateIssueDialog } from "../../issues/_components/create-issue-dialog";
import { deleteIssue } from "../../issues/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; email: string; image: string | null; }

interface ChildIssue {
  id: string; key: number; title: string; type: string;
  status: string; priority: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
}

interface Epic {
  id: string; key: number; title: string; description: string | null;
  status: string; priority: string;
  dueDate: Date | null; estimate: number | null;
  createdAt: Date; updatedAt: Date;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  commentCount: number;
  totalChildren: number;
  doneChildren: number;
  children: ChildIssue[];
}

interface EpicsClientProps {
  project: { id: string; name: string; key: string };
  epics: Epic[];
  members: Member[];
  workspaceSlug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     "bg-muted text-muted-foreground",
  TODO:        "bg-muted text-foreground",
  IN_PROGRESS: "bg-primary/10 text-primary",
  IN_REVIEW:   "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  DONE:        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CANCELLED:   "bg-muted text-muted-foreground",
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
        <motion.div
          className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-primary")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Child issue row ──────────────────────────────────────────────────────────

function ChildIssueRow({
  child, projectKey, workspaceSlug, index,
}: {
  child: ChildIssue; projectKey: string; workspaceSlug: string; index: number;
}) {
  const status   = getStatusConfig(child.status);
  const priority = getPriorityConfig(child.priority);
  const type     = getTypeConfig(child.type);
  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;

  return (
    <motion.a
      href={`/workspace/${workspaceSlug}/projects/${projectKey}/issues/${child.key}`}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="group flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/30"
    >
      <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
      <TypeIcon     className={cn("size-3.5 shrink-0", type.color)} />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {projectKey}-{child.key}
      </span>
      <span className="flex-1 truncate text-sm text-foreground group-hover:text-primary transition-colors">
        {child.title}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>
      {child.assignee ? (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={child.assignee.image ?? undefined} />
          <AvatarFallback className="text-[9px]">{getInitials(child.assignee.name)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-5 shrink-0 rounded-full border border-dashed border-border" />
      )}
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
    </motion.a>
  );
}

// ─── Epic card ────────────────────────────────────────────────────────────────

function EpicCard({
  epic, project, workspaceSlug, members, index, onDeleted,
}: {
  epic: Epic; project: { id: string; name: string; key: string };
  workspaceSlug: string; members: Member[]; index: number;
  onDeleted: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  const priority = getPriorityConfig(epic.priority);
  const PriorityIcon = priority.icon;
  const pct = epic.totalChildren > 0
    ? Math.round((epic.doneChildren / epic.totalChildren) * 100)
    : 0;

  function handleDelete() {
    startDelete(async () => {
      const result = await deleteIssue(epic.id);
      if (result.success) onDeleted(epic.id);
      setShowDeleteDialog(false);
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.22, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
        className="overflow-hidden rounded-xl border border-border bg-card"
      >
        {/* Epic header */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <motion.span
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="block"
            >
              <ChevronRight className="size-4" />
            </motion.span>
          </button>

          {/* Epic icon */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
            <Zap className="size-4 text-purple-600 dark:text-purple-400" />
          </div>

          {/* Title + key */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <a
                href={`/workspace/${workspaceSlug}/projects/${project.key}/issues/${epic.key}`}
                className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                {epic.title}
              </a>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {project.key}-{epic.key}
              </span>
            </div>
            {epic.totalChildren > 0 && (
              <div className="mt-1.5">
                <ProgressBar done={epic.doneChildren} total={epic.totalChildren} />
              </div>
            )}
          </div>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn("shrink-0 text-[11px] px-2 py-0.5 border-current/20", STATUS_COLORS[epic.status])}
          >
            {getStatusConfig(epic.status).label}
          </Badge>

          {/* Priority */}
          <PriorityIcon className={cn("size-4 shrink-0", priority.color)} />

          {/* Due date */}
          {epic.dueDate && (
            <div className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
              <CalendarDays className="size-3.5" />
              {formatDate(epic.dueDate)}
            </div>
          )}

          {/* Assignee */}
          {epic.assignee ? (
            <Avatar className="size-6 shrink-0">
              <AvatarImage src={epic.assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(epic.assignee.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="size-6 shrink-0 rounded-full border border-dashed border-border" />
          )}

          {/* Comment count */}
          {epic.commentCount > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {epic.commentCount}
            </div>
          )}

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <a href={`/workspace/${workspaceSlug}/projects/${project.key}/issues/${epic.key}`}>
                  <ExternalLink className="mr-2 size-3.5" />
                  Open full page
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete epic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar strip */}
        {epic.totalChildren > 0 && (
          <div className="h-0.5 w-full bg-border">
            <motion.div
              className={cn("h-full", pct === 100 ? "bg-emerald-500" : "bg-primary")}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.05 + 0.1 }}
            />
          </div>
        )}

        {/* Children */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="border-t border-border px-5 py-3">
                {epic.children.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <p className="text-sm text-muted-foreground">No child issues yet.</p>
                    <CreateIssueDialog
                      projectId={project.id}
                      projectKey={project.key}
                      workspaceSlug={workspaceSlug}
                      members={members}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Plus className="size-3.5" />
                          Add issue to epic
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {epic.children.map((child, i) => (
                      <ChildIssueRow
                        key={child.id}
                        child={child}
                        projectKey={project.key}
                        workspaceSlug={workspaceSlug}
                        index={i}
                      />
                    ))}
                    <div className="mt-2">
                      <CreateIssueDialog
                        projectId={project.id}
                        projectKey={project.key}
                        workspaceSlug={workspaceSlug}
                        members={members}
                        trigger={
                          <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                          >
                            <Plus className="size-3.5" />
                            Add issue
                          </button>
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete epic</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{project.key}-{epic.key} · {epic.title}</strong>.
              Child issues will not be deleted but will lose their epic association.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="gap-1.5">
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete epic
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EpicsClient({ project, epics: initialEpics, members, workspaceSlug }: EpicsClientProps) {
  const [epics, setEpics]     = useState(initialEpics);
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return epics.filter((e) => {
      const matchesSearch = !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        `${project.key}-${e.key}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [epics, search, statusFilter, project.key]);

  // Stats
  const totalEpics = epics.length;
  const doneEpics  = epics.filter((e) => e.status === "DONE" || e.status === "CANCELLED").length;
  const totalIssues = epics.reduce((s, e) => s + e.totalChildren, 0);
  const doneIssues  = epics.reduce((s, e) => s + e.doneChildren, 0);

  function handleDeleted(id: string) {
    setEpics((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search epics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className={cn("h-8 w-36 text-xs", statusFilter !== "all" && "border-primary text-primary")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2 text-xs">
                    <Icon className={cn("size-3.5", color)} />{label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CreateIssueDialog
          projectId={project.id}
          projectKey={project.key}
          workspaceSlug={workspaceSlug}
          members={members}
          trigger={
            <Button size="sm" className="gap-1.5">
              <Plus className="size-4" />
              New epic
            </Button>
          }
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats row */}
        {epics.length > 0 && (
          <FadeIn direction="down" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total epics",   value: totalEpics,  color: "text-purple-600 dark:text-purple-400" },
              { label: "Completed",     value: doneEpics,   color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Total issues",  value: totalIssues, color: "text-primary" },
              { label: "Issues done",   value: doneIssues,  color: "text-emerald-600 dark:text-emerald-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("mt-1 text-2xl font-bold", color)}>{value}</p>
              </div>
            ))}
          </FadeIn>
        )}

        {/* Empty state */}
        {epics.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-purple-500/10">
              <Zap className="size-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">No epics yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Epics help you group related issues and track progress across sprints.
            </p>
            <div className="mt-6">
              <CreateIssueDialog
                projectId={project.id}
                projectKey={project.key}
                workspaceSlug={workspaceSlug}
                members={members}
                trigger={
                  <Button className="gap-1.5">
                    <Plus className="size-4" />
                    Create your first epic
                  </Button>
                }
              />
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <p className="text-sm text-muted-foreground">No epics match your filters.</p>
            <Button
              variant="ghost" size="sm" className="mt-3"
              onClick={() => { setSearch(""); setStatusFilter("all"); }}
            >
              Clear filters
            </Button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "epic" : "epics"}
              </span>
            </div>
            <AnimatePresence initial={false}>
              {filtered.map((epic, i) => (
                <EpicCard
                  key={epic.id}
                  epic={epic}
                  project={project}
                  workspaceSlug={workspaceSlug}
                  members={members}
                  index={i}
                  onDeleted={handleDeleted}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
