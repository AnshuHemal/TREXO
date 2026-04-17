"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Search, SlidersHorizontal, CalendarDays,
  ArrowUpDown, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getStatusConfig,
  getPriorityConfig,
  getTypeConfig,
} from "@/lib/issue-config";
import { isOverdue, isDueThisWeek, formatDueDate } from "@/lib/due-date";
import { cn } from "@/lib/utils";
import { CreateIssueDialog } from "../../issues/_components/create-issue-dialog";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface IssueRow {
  id: string;
  key: number;
  title: string;
  type: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  description: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
}

type SortKey = "default" | "dueDate" | "priority" | "createdAt" | "updatedAt";
type DueDateFilter = "all" | "due_this_week" | "overdue" | "no_due_date";

interface BacklogClientProps {
  project: { id: string; name: string; key: string };
  issues: IssueRow[];
  members: Member[];
  currentUserId: string;
  currentUserName?: string;
  currentUserImage?: string | null;
  workspaceSlug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NO_PRIORITY: 4,
};

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRowItem({
  issue,
  projectKey,
  index,
  onClick,
}: {
  issue: IssueRow;
  projectKey: string;
  index: number;
  onClick: () => void;
}) {
  const status   = getStatusConfig(issue.status);
  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);

  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;

  const overdue     = isOverdue(issue.dueDate, issue.status);
  const dueThisWeek = !overdue && isDueThisWeek(issue.dueDate, issue.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-accent/30 transition-colors"
    >
      <PriorityIcon className={cn("size-4 shrink-0", priority.color)} />
      <TypeIcon     className={cn("size-4 shrink-0", type.color)} />

      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {projectKey}-{issue.key}
      </span>

      <span className="flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
        {issue.title}
      </span>

      {/* Due date badge */}
      {issue.dueDate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:flex",
            overdue
              ? "bg-destructive/10 text-destructive"
              : dueThisWeek
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          <CalendarDays className="size-3" />
          {overdue ? "Overdue" : formatDueDate(issue.dueDate)}
        </motion.div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>

      {issue.commentCount > 0 && (
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {issue.commentCount}
        </div>
      )}

      <div className="shrink-0">
        {issue.assignee ? (
          <Avatar className="size-6">
            <AvatarImage src={issue.assignee.image ?? undefined} />
            <AvatarFallback className="text-[10px]">{getInitials(issue.assignee.name)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-6 rounded-full border border-dashed border-border" />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BacklogClient({
  project,
  issues: initialIssues,
  members,
  currentUserId,
  currentUserName,
  currentUserImage,
  workspaceSlug: _workspaceSlug,
}: BacklogClientProps) {
  const [issues, setIssues]               = useState(initialIssues);
  const [search, setSearch]               = useState("");
  const [sortKey, setSortKey]             = useState<SortKey>("default");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail]         = useState<IssueDetail | null>(null);
  const [isLoadingDetail, startDetailTransition] = useTransition();

  const hasActiveFilters = dueDateFilter !== "all";

  // ── Filter + sort ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = issues.filter((i) => {
      const matchesSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        `${project.key}-${i.key}`.toLowerCase().includes(search.toLowerCase());

      const matchesDueDate =
        dueDateFilter === "all" ||
        (dueDateFilter === "overdue"      && isOverdue(i.dueDate, i.status)) ||
        (dueDateFilter === "due_this_week" && isDueThisWeek(i.dueDate, i.status)) ||
        (dueDateFilter === "no_due_date"  && !i.dueDate);

      return matchesSearch && matchesDueDate;
    });

    if (sortKey === "dueDate") {
      result = [...result].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    } else if (sortKey === "priority") {
      result = [...result].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99),
      );
    } else if (sortKey === "createdAt") {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sortKey === "updatedAt") {
      result = [...result].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return result;
  }, [issues, search, sortKey, dueDateFilter, project.key]);

  // ── Issue detail modal ────────────────────────────────────────────────────────

  async function handleOpenIssue(issueId: string) {
    setSelectedIssueId(issueId);
    startDetailTransition(async () => {
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) {
        const data = await res.json();
        setIssueDetail(data);
      }
    });
  }

  function handleCloseModal() {
    setSelectedIssueId(null);
    setIssueDetail(null);
  }

  function handleIssueDeleted() {
    if (selectedIssueId) setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
    handleCloseModal();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-48 pl-8 text-sm"
            />
          </div>

          {/* Due date filter */}
          <Select value={dueDateFilter} onValueChange={(v) => setDueDateFilter(v as DueDateFilter)}>
            <SelectTrigger className={cn("h-8 w-36 text-xs", hasActiveFilters && "border-primary text-primary")}>
              <CalendarDays className="mr-1.5 size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due_this_week">Due this week</SelectItem>
              <SelectItem value="no_due_date">No due date</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", sortKey !== "default" && "border-primary text-primary")}>
                <ArrowUpDown className="size-3.5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: "default",   label: "Default" },
                { key: "dueDate",   label: "Due date" },
                { key: "priority",  label: "Priority" },
                { key: "createdAt", label: "Created" },
                { key: "updatedAt", label: "Last updated" },
              ].map(({ key, label }) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortKey(key as SortKey)}
                  className={cn("text-xs", sortKey === key && "text-primary font-medium")}
                >
                  {label}
                  {sortKey === key && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters */}
          {(hasActiveFilters || sortKey !== "default") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setDueDateFilter("all"); setSortKey("default"); }}
            >
              <X className="size-3.5" />Clear
            </Button>
          )}
        </div>

        <CreateIssueDialog
          projectId={project.id}
          projectKey={project.key}
          workspaceSlug={_workspaceSlug}
          members={members}
        />
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilters
                ? "No issues match your filters."
                : "No issues yet. Create your first issue to get started."}
            </p>
            {!search && !hasActiveFilters && (
              <div className="mt-4">
                <CreateIssueDialog
                  projectId={project.id}
                  projectKey={project.key}
                  workspaceSlug={_workspaceSlug}
                  members={members}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "issue" : "issues"}
              </span>
            </div>
            {filtered.map((issue, i) => (
              <IssueRowItem
                key={issue.id}
                issue={issue}
                projectKey={project.key}
                index={i}
                onClick={() => handleOpenIssue(issue.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Issue detail modal */}
      <AnimatePresence>
        {selectedIssueId && (
          isLoadingDetail || !issueDetail ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </motion.div>
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
    </div>
  );
}
