"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Search, CalendarDays, ArrowUpDown, X,
  ChevronDown, Plus, Check, Loader2, Layers, Eye, EyeOff,
  SquareCheck, Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getStatusConfig, getPriorityConfig, getTypeConfig,
  ISSUE_STATUSES, ISSUE_PRIORITIES,
} from "@/lib/issue-config";
import { isOverdue, isDueThisWeek, formatDueDate } from "@/lib/due-date";
import { cn } from "@/lib/utils";
import { createIssue, bulkUpdateIssues } from "../../issues/actions";
import { CreateIssueDialog } from "../../issues/_components/create-issue-dialog";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; email: string; image: string | null; }

interface IssueRow {
  id: string; key: number; title: string; type: string; status: string;
  priority: string; assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  description: string | null; dueDate: Date | null;
  createdAt: Date; updatedAt: Date; commentCount: number;
}

type SortKey      = "default" | "dueDate" | "priority" | "status" | "createdAt" | "updatedAt";
type GroupBy      = "none" | "status" | "priority" | "assignee";
type DueDateFilter = "all" | "due_this_week" | "overdue" | "no_due_date";

interface VisibleColumns {
  type: boolean; priority: boolean; assignee: boolean; dueDate: boolean;
}

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
const STATUS_ORDER: Record<string, number> = {
  BACKLOG: 0, TODO: 1, IN_PROGRESS: 2, IN_REVIEW: 3, DONE: 4, CANCELLED: 5,
};

function getGroupKey(issue: IssueRow, groupBy: GroupBy): string {
  if (groupBy === "status")   return issue.status;
  if (groupBy === "priority") return issue.priority;
  if (groupBy === "assignee") return issue.assignee?.name ?? "Unassigned";
  return "all";
}

function getGroupLabel(key: string, groupBy: GroupBy): string {
  if (groupBy === "status")   return getStatusConfig(key).label;
  if (groupBy === "priority") return getPriorityConfig(key).label;
  return key;
}

function sortGroups(keys: string[], groupBy: GroupBy): string[] {
  if (groupBy === "status")   return keys.sort((a, b) => (STATUS_ORDER[a] ?? 99) - (STATUS_ORDER[b] ?? 99));
  if (groupBy === "priority") return keys.sort((a, b) => (PRIORITY_ORDER[a] ?? 99) - (PRIORITY_ORDER[b] ?? 99));
  return keys.sort();
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRowItem({
  issue, projectKey, index, selected, onSelect, onClick, visibleColumns,
}: {
  issue: IssueRow; projectKey: string; index: number;
  selected: boolean; onSelect: (id: string, checked: boolean) => void;
  onClick: () => void; visibleColumns: VisibleColumns;
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
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: index * 0.02, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
        selected
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onSelect(issue.id, !selected); }}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        aria-label={selected ? "Deselect" : "Select"}
      >
        {selected
          ? <SquareCheck className="size-4 text-primary" />
          : <Square className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        }
      </button>

      {visibleColumns.priority && <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />}
      {visibleColumns.type     && <TypeIcon     className={cn("size-3.5 shrink-0", type.color)} />}

      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {projectKey}-{issue.key}
      </span>

      <span
        className="flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors"
        onClick={onClick}
      >
        {issue.title}
      </span>

      {visibleColumns.dueDate && issue.dueDate && (
        <div className={cn(
          "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium sm:flex",
          overdue ? "bg-destructive/10 text-destructive"
            : dueThisWeek ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}>
          <CalendarDays className="size-3" />
          {overdue ? "Overdue" : formatDueDate(issue.dueDate)}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5" onClick={onClick}>
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>

      {issue.commentCount > 0 && (
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" onClick={onClick}>
          <MessageSquare className="size-3.5" />
          {issue.commentCount}
        </div>
      )}

      {visibleColumns.assignee && (
        <div className="shrink-0" onClick={onClick}>
          {issue.assignee ? (
            <Avatar className="size-6">
              <AvatarImage src={issue.assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px]">{getInitials(issue.assignee.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="size-6 rounded-full border border-dashed border-border" />
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Group section ────────────────────────────────────────────────────────────

function GroupSection({
  groupKey, groupBy, issues, projectKey, selectedIds, onSelect, onOpenIssue,
  visibleColumns, project, groupIndex,
}: {
  groupKey: string; groupBy: GroupBy; issues: IssueRow[]; projectKey: string;
  selectedIds: Set<string>; onSelect: (id: string, checked: boolean) => void;
  onOpenIssue: (id: string) => void; visibleColumns: VisibleColumns;
  project: { id: string; name: string; key: string };
  groupIndex: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle]     = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const label = groupBy === "none" ? "All Issues" : getGroupLabel(groupKey, groupBy);
  const allSelected = issues.length > 0 && issues.every((i) => selectedIds.has(i.id));

  function handleGroupSelect() {
    const shouldSelect = !allSelected;
    issues.forEach((i) => onSelect(i.id, shouldSelect));
  }

  function handleInlineCreate() {
    if (!newTitle.trim()) { setIsCreating(false); return; }
    startTransition(async () => {
      const statusForGroup = groupBy === "status" ? groupKey as never : undefined;
      await createIssue({ projectId: project.id, title: newTitle, status: statusForGroup });
      setNewTitle("");
      setIsCreating(false);
      window.location.reload();
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: groupIndex * 0.06 }}
      className="flex flex-col gap-1.5"
    >
      {/* Group header */}
      {groupBy !== "none" && (
        <div className="flex items-center gap-2 py-1">
          <button
            type="button"
            onClick={handleGroupSelect}
            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
            aria-label={allSelected ? "Deselect group" : "Select group"}
          >
            {allSelected
              ? <SquareCheck className="size-4 text-primary" />
              : <Square className="size-4" />
            }
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="size-4 text-muted-foreground" />
            </motion.span>
            {label}
            <span className="text-xs font-normal text-muted-foreground">({issues.length})</span>
          </button>
        </div>
      )}

      {/* Issues */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col gap-1 overflow-hidden"
          >
            {issues.map((issue, i) => (
              <IssueRowItem
                key={issue.id}
                issue={issue}
                projectKey={projectKey}
                index={i}
                selected={selectedIds.has(issue.id)}
                onSelect={onSelect}
                onClick={() => onOpenIssue(issue.id)}
                visibleColumns={visibleColumns}
              />
            ))}

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
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-4 py-2.5">
                    <Input
                      ref={inputRef}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleInlineCreate();
                        if (e.key === "Escape") { setIsCreating(false); setNewTitle(""); }
                      }}
                      placeholder="Issue title…"
                      autoFocus
                      disabled={isPending}
                      className="h-7 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                    <Button size="icon" className="size-6" disabled={!newTitle.trim() || isPending} onClick={handleInlineCreate}>
                      {isPending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-6" onClick={() => { setIsCreating(false); setNewTitle(""); }}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add issue button */}
            {!isCreating && (
              <button
                type="button"
                onClick={() => { setIsCreating(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
              >
                <Plus className="size-3.5" />
                Add issue
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkActionBar({
  selectedCount, onClear, onBulkUpdate, members, isPending,
}: {
  selectedCount: number; onClear: () => void;
  onBulkUpdate: (field: string, value: string | null) => void;
  members: Member[]; isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card px-4 py-2.5 shadow-md"
    >
      <span className="text-sm font-medium text-foreground">
        {selectedCount} selected
      </span>

      <div className="mx-2 h-4 w-px bg-border" />

      {/* Status */}
      <Select onValueChange={(v) => onBulkUpdate("status", v)} disabled={isPending}>
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue placeholder="Set status" />
        </SelectTrigger>
        <SelectContent>
          {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2 text-xs">
                <Icon className={cn("size-3.5", color)} />{label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority */}
      <Select onValueChange={(v) => onBulkUpdate("priority", v)} disabled={isPending}>
        <SelectTrigger className="h-7 w-32 text-xs">
          <SelectValue placeholder="Set priority" />
        </SelectTrigger>
        <SelectContent>
          {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2 text-xs">
                <Icon className={cn("size-3.5", color)} />{label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee */}
      <Select onValueChange={(v) => onBulkUpdate("assigneeId", v === "none" ? null : v)} disabled={isPending}>
        <SelectTrigger className="h-7 w-36 text-xs">
          <SelectValue placeholder="Assign to…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <span className="flex items-center gap-2 text-xs">
                <Avatar className="size-4">
                  <AvatarImage src={m.image ?? undefined} />
                  <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                </Avatar>
                {m.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

      <div className="ml-auto">
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onClear}>
          <X className="size-3.5" />Clear
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BacklogClient({
  project, issues: initialIssues, members, currentUserId,
  currentUserName, currentUserImage, workspaceSlug,
}: BacklogClientProps) {
  const [issues, setIssues]               = useState(initialIssues);
  const [search, setSearch]               = useState("");
  const [sortKey, setSortKey]             = useState<SortKey>("default");
  const [groupBy, setGroupBy]             = useState<GroupBy>("none");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>({
    type: true, priority: true, assignee: true, dueDate: true,
  });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail]         = useState<IssueDetail | null>(null);
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [isBulkPending, startBulkTransition]     = useTransition();

  const hasActiveFilters = dueDateFilter !== "all";
  const selectedCount    = selectedIds.size;

  // ── Selection ─────────────────────────────────────────────────────────────────

  function handleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }

  function clearSelection() { setSelectedIds(new Set()); }

  // ── Bulk update ───────────────────────────────────────────────────────────────

  function handleBulkUpdate(field: string, value: string | null) {
    startBulkTransition(async () => {
      const input = {
        issueIds: Array.from(selectedIds),
        ...(field === "status"     && { status:     value as never }),
        ...(field === "priority"   && { priority:   value as never }),
        ...(field === "assigneeId" && { assigneeId: value }),
      };
      const result = await bulkUpdateIssues(input);
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

  // ── Filter + sort ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = issues.filter((i) => {
      const matchesSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        `${project.key}-${i.key}`.toLowerCase().includes(search.toLowerCase());

      const matchesDueDate =
        dueDateFilter === "all" ||
        (dueDateFilter === "overdue"       && isOverdue(i.dueDate, i.status)) ||
        (dueDateFilter === "due_this_week" && isDueThisWeek(i.dueDate, i.status)) ||
        (dueDateFilter === "no_due_date"   && !i.dueDate);

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
      result = [...result].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
    } else if (sortKey === "status") {
      result = [...result].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
    } else if (sortKey === "createdAt") {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortKey === "updatedAt") {
      result = [...result].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [issues, search, sortKey, dueDateFilter, project.key]);

  // ── Group ─────────────────────────────────────────────────────────────────────

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", issues: filtered }];
    const map = new Map<string, IssueRow[]>();
    for (const issue of filtered) {
      const k = getGroupKey(issue, groupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(issue);
    }
    const sortedKeys = sortGroups(Array.from(map.keys()), groupBy);
    return sortedKeys.map((k) => ({ key: k, issues: map.get(k)! }));
  }, [filtered, groupBy]);

  // ── Issue detail modal ────────────────────────────────────────────────────────

  async function handleOpenIssue(issueId: string) {
    setSelectedIssueId(issueId);
    startDetailTransition(async () => {
      const res = await fetch(`/api/issues/${issueId}`);
      if (res.ok) setIssueDetail(await res.json());
    });
  }

  function handleCloseModal() { setSelectedIssueId(null); setIssueDetail(null); }
  function handleIssueDeleted() {
    if (selectedIssueId) setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
    handleCloseModal();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-44 pl-8 text-sm" />
          </div>

          {/* Group by */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className={cn("h-8 w-auto min-w-[10rem] text-xs", groupBy !== "none" && "border-primary text-primary")}>
              <Layers className="mr-1.5 size-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="status">Group by status</SelectItem>
              <SelectItem value="priority">Group by priority</SelectItem>
              <SelectItem value="assignee">Group by assignee</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-8 gap-1.5 text-xs", sortKey !== "default" && "border-primary text-primary")}>
                <ArrowUpDown className="size-3.5" />Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { key: "default",   label: "Default" },
                { key: "status",    label: "Status" },
                { key: "priority",  label: "Priority" },
                { key: "dueDate",   label: "Due date" },
                { key: "createdAt", label: "Created" },
                { key: "updatedAt", label: "Last updated" },
              ].map(({ key, label }) => (
                <DropdownMenuItem key={key} onClick={() => setSortKey(key as SortKey)}
                  className={cn("text-xs", sortKey === key && "text-primary font-medium")}>
                  {label}{sortKey === key && <span className="ml-auto">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Eye className="size-3.5" />Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["type", "priority", "assignee", "dueDate"] as const).map((col) => (
                <DropdownMenuItem key={col} onClick={() => setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }))}
                  className="flex items-center justify-between text-xs">
                  {col === "dueDate" ? "Due date" : col.charAt(0).toUpperCase() + col.slice(1)}
                  {visibleColumns[col] ? <Eye className="size-3.5 text-primary" /> : <EyeOff className="size-3.5 text-muted-foreground" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear */}
          {(hasActiveFilters || sortKey !== "default" || groupBy !== "none") && (
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { setDueDateFilter("all"); setSortKey("default"); setGroupBy("none"); }}>
              <X className="size-3.5" />Clear
            </Button>
          )}
        </div>

        <CreateIssueDialog projectId={project.id} projectKey={project.key} workspaceSlug={workspaceSlug} members={members} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Bulk action bar */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <div className="mb-4">
              <BulkActionBar
                selectedCount={selectedCount}
                onClear={clearSelection}
                onBulkUpdate={handleBulkUpdate}
                members={members}
                isPending={isBulkPending}
              />
            </div>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilters ? "No issues match your filters." : "No issues yet."}
            </p>
            {!search && !hasActiveFilters && (
              <div className="mt-4">
                <CreateIssueDialog projectId={project.id} projectKey={project.key} workspaceSlug={workspaceSlug} members={members} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "issue" : "issues"}
                {selectedCount > 0 && ` · ${selectedCount} selected`}
              </span>
            </div>
            {groups.map(({ key, issues: groupIssues }, gi) => (
              <GroupSection
                key={key}
                groupKey={key}
                groupBy={groupBy}
                issues={groupIssues}
                projectKey={project.key}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onOpenIssue={handleOpenIssue}
                visibleColumns={visibleColumns}
                project={project}
                groupIndex={gi}
              />
            ))}
          </div>
        )}
      </div>

      {/* Issue detail modal */}
      <AnimatePresence>
        {selectedIssueId && (
          isLoadingDetail || !issueDetail ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
