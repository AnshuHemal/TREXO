"use client";

import {
  useState, useTransition, useMemo, useCallback, useRef, useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Plus, Check, Loader2, Filter, RotateCcw,
  MessageSquare, GitBranch, Zap, ShieldAlert,
  CalendarDays, SquareCheck, Square, SlidersHorizontal,
  ArrowUpDown, Eye, EyeOff, MoreHorizontal,
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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES,
  getStatusConfig, getPriorityConfig, getTypeConfig,
} from "@/lib/issue-config";
import { isOverdue, isDueThisWeek, formatDueDate } from "@/lib/due-date";
import { cn } from "@/lib/utils";
import { updateIssue, bulkUpdateIssues } from "../../issues/actions";
import { CreateIssueDialog } from "../../issues/_components/create-issue-dialog";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; email: string; image: string | null }

export interface ListIssue {
  id: string; key: number; title: string;
  type: string; status: string; priority: string;
  estimate: number | null; dueDate: Date | null;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  description: string | null;
  createdAt: Date; updatedAt: Date;
  sprintId: string | null; sprintName: string | null;
  commentCount: number; subTaskCount: number;
  epicId: string | null; epicTitle: string | null; epicKey: number | null;
  isBlocked: boolean;
}

interface SprintOption { id: string; name: string; status: string }
interface EpicOption   { id: string; key: number; title: string }

interface IssueListClientProps {
  project: { id: string; name: string; key: string };
  issues: ListIssue[];
  members: Member[];
  sprints: SprintOption[];
  epics: EpicOption[];
  currentUserId: string;
  currentUserName: string;
  currentUserImage: string | null;
  workspaceSlug: string;
  workspaceId: string;
}

// ─── Sort / filter types ──────────────────────────────────────────────────────

type SortField = "key" | "title" | "status" | "priority" | "assignee" | "dueDate" | "estimate" | "createdAt" | "updatedAt";
type SortDir   = "asc" | "desc";

interface Filters {
  search:    string;
  status:    string;   // "" = all
  priority:  string;
  type:      string;
  assignee:  string;
  sprint:    string;
  epic:      string;
}

interface VisibleCols {
  type:      boolean;
  priority:  boolean;
  status:    boolean;
  assignee:  boolean;
  dueDate:   boolean;
  estimate:  boolean;
  sprint:    boolean;
  epic:      boolean;
  comments:  boolean;
  created:   boolean;
  updated:   boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NO_PRIORITY: 4,
};
const STATUS_ORDER: Record<string, number> = {
  BACKLOG: 0, TODO: 1, IN_PROGRESS: 2, IN_REVIEW: 3, DONE: 4, CANCELLED: 5,
};

const DEFAULT_COLS: VisibleCols = {
  type: true, priority: true, status: true, assignee: true,
  dueDate: true, estimate: true, sprint: false, epic: true,
  comments: true, created: false, updated: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function sortIssues(issues: ListIssue[], field: SortField, dir: SortDir): ListIssue[] {
  return [...issues].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case "key":       cmp = a.key - b.key; break;
      case "title":     cmp = a.title.localeCompare(b.title); break;
      case "status":    cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99); break;
      case "priority":  cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99); break;
      case "assignee":  cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? ""); break;
      case "dueDate":   cmp = (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity); break;
      case "estimate":  cmp = (a.estimate ?? 0) - (b.estimate ?? 0); break;
      case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
      case "updatedAt": cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Sort header cell ─────────────────────────────────────────────────────────

function SortHeader({
  field, label, sortField, sortDir, onSort, className,
}: {
  field: SortField; label: string;
  sortField: SortField; sortDir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = sortField === field;
  return (
    <th
      className={cn(
        "select-none whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground",
        "cursor-pointer hover:text-foreground transition-colors",
        isActive && "text-foreground",
        className,
      )}
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive ? (
          sortDir === "asc"
            ? <ChevronUp className="size-3" />
            : <ChevronDown className="size-3" />
        ) : (
          <ChevronsUpDown className="size-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

// ─── Inline cell editor ───────────────────────────────────────────────────────

function InlineSelect({
  value, options, onSave, disabled, trigger,
}: {
  value: string;
  options: { value: string; label: string; icon?: React.ElementType; color?: string }[];
  onSave: (v: string) => void;
  disabled?: boolean;
  trigger: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onSave} disabled={disabled}>
      <SelectTrigger asChild>
        <button
          className="flex items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-accent focus:outline-none"
          disabled={disabled}
        >
          {trigger}
        </button>
      </SelectTrigger>
      <SelectContent>
        {options.map(({ value: v, label, icon: Icon, color }) => (
          <SelectItem key={v} value={v}>
            <span className="flex items-center gap-2 text-xs">
              {Icon && <Icon className={cn("size-3.5", color)} />}
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Inline title editor ──────────────────────────────────────────────────────

function InlineTitleCell({
  issue, projectKey, onSave, onOpen, disabled,
}: {
  issue: ListIssue; projectKey: string;
  onSave: (id: string, title: string) => void;
  onOpen: (id: string) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(issue.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== issue.title) onSave(issue.id, trimmed);
    setEditing(false);
  }

  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 30);
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(issue.title); setEditing(false); }
        }}
        className="w-full rounded border border-primary/40 bg-background px-2 py-0.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={disabled}
      />
    );
  }

  return (
    <div className="group/title flex min-w-0 items-center gap-2">
      <span
        className="flex-1 cursor-pointer truncate text-sm font-medium text-foreground transition-colors hover:text-primary"
        onClick={() => onOpen(issue.id)}
      >
        {issue.title}
      </span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setDraft(issue.title); setEditing(true); }}
        className="shrink-0 opacity-0 transition-opacity group-hover/title:opacity-100 text-muted-foreground hover:text-foreground"
        title="Edit title (double-click)"
        disabled={disabled}
      >
        <svg className="size-3" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287a.253.253 0 0 0-.064.108l-.558 1.953 1.953-.558a.253.253 0 0 0 .108-.064Zm1.238-3.763a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354Z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Inline assignee cell ─────────────────────────────────────────────────────

function AssigneeCell({
  issue, members, onSave, disabled,
}: {
  issue: ListIssue; members: Member[];
  onSave: (id: string, assigneeId: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={issue.assigneeId ?? "none"}
      onValueChange={(v) => onSave(issue.id, v === "none" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger asChild>
        <button className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-accent focus:outline-none" disabled={disabled}>
          {issue.assignee ? (
            <>
              <Avatar className="size-5">
                <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
              </Avatar>
              <span className="max-w-[80px] truncate text-xs text-foreground">{issue.assignee.name}</span>
            </>
          ) : (
            <div className="size-5 rounded-full border border-dashed border-border" />
          )}
        </button>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-xs text-muted-foreground">Unassigned</span>
        </SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <span className="flex items-center gap-2 text-xs">
              <Avatar className="size-4">
                <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
              </Avatar>
              {m.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Inline due date cell ─────────────────────────────────────────────────────

function DueDateCell({
  issue, onSave, disabled,
}: {
  issue: ListIssue;
  onSave: (id: string, date: Date | null) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const overdue     = isOverdue(issue.dueDate, issue.status);
  const dueThisWeek = !overdue && isDueThisWeek(issue.dueDate, issue.status);

  if (editing) {
    return (
      <input
        type="date"
        defaultValue={issue.dueDate ? new Date(issue.dueDate).toISOString().split("T")[0] : ""}
        autoFocus
        onBlur={(e) => {
          const val = e.target.value;
          onSave(issue.id, val ? new Date(val) : null);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-28 rounded border border-primary/40 bg-background px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={disabled}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent",
        overdue     ? "text-destructive"
        : dueThisWeek ? "text-primary"
        : issue.dueDate ? "text-muted-foreground"
        : "text-muted-foreground/40",
      )}
    >
      <CalendarDays className="size-3" />
      {issue.dueDate ? formatDueDate(issue.dueDate) : <span className="opacity-40">—</span>}
    </button>
  );
}

// ─── Inline estimate cell ─────────────────────────────────────────────────────

const ESTIMATE_OPTS = [
  { value: "none", label: "—" },
  { value: "1",  label: "1 (XS)" },
  { value: "2",  label: "2 (S)"  },
  { value: "3",  label: "3 (M)"  },
  { value: "5",  label: "5 (L)"  },
  { value: "8",  label: "8 (XL)" },
  { value: "13", label: "13 (XXL)" },
];

function EstimateCell({
  issue, onSave, disabled,
}: {
  issue: ListIssue;
  onSave: (id: string, estimate: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={issue.estimate != null ? String(issue.estimate) : "none"}
      onValueChange={(v) => onSave(issue.id, v === "none" ? null : Number(v))}
      disabled={disabled}
    >
      <SelectTrigger asChild>
        <button className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent focus:outline-none" disabled={disabled}>
          <Zap className="size-3 text-primary" />
          <span className={cn(issue.estimate != null ? "text-foreground" : "text-muted-foreground/40")}>
            {issue.estimate ?? "—"}
          </span>
        </button>
      </SelectTrigger>
      <SelectContent>
        {ESTIMATE_OPTS.map(({ value, label }) => (
          <SelectItem key={value} value={value}>
            <span className="text-xs">{label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function IssueTableRow({
  issue, index, projectKey, members, cols,
  selected, onSelect, onOpen,
  onUpdateTitle, onUpdateField, onUpdateAssignee, onUpdateDueDate, onUpdateEstimate,
  isPending,
}: {
  issue: ListIssue; index: number; projectKey: string; members: Member[];
  cols: VisibleCols; selected: boolean;
  onSelect: (id: string, v: boolean) => void;
  onOpen: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateField: (id: string, field: string, value: string) => void;
  onUpdateAssignee: (id: string, assigneeId: string | null) => void;
  onUpdateDueDate: (id: string, date: Date | null) => void;
  onUpdateEstimate: (id: string, estimate: number | null) => void;
  isPending: boolean;
}) {
  const status   = getStatusConfig(issue.status);
  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);
  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;
  const overdue = isOverdue(issue.dueDate, issue.status);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.3) }}
      className={cn(
        "group border-b border-border transition-colors",
        selected ? "bg-primary/5 hover:bg-primary/8"
        : overdue ? "bg-destructive/3 hover:bg-destructive/5"
        : "hover:bg-muted/40",
      )}
    >
      <td className="w-10 px-3 py-2.5">
        <button type="button" onClick={() => onSelect(issue.id, !selected)}
          className="text-muted-foreground transition-colors hover:text-primary">
          {selected
            ? <SquareCheck className="size-4 text-primary" />
            : <Square className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />}
        </button>
      </td>
      <td className="w-20 px-3 py-2.5">
        <span className="font-mono text-xs text-muted-foreground">{projectKey}-{issue.key}</span>
      </td>
      {cols.type && (
        <td className="w-10 px-2 py-2.5">
          <InlineSelect value={issue.type} onSave={(v) => onUpdateField(issue.id, "type", v)}
            disabled={isPending}
            options={ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => ({ value, label, icon: Icon, color }))}
            trigger={<TypeIcon className={cn("size-3.5", type.color)} />}
          />
        </td>
      )}
      <td className="min-w-0 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {issue.isBlocked && <ShieldAlert className="size-3.5 shrink-0 text-destructive" aria-label="Blocked" />}
          <InlineTitleCell issue={issue} projectKey={projectKey} onSave={onUpdateTitle} onOpen={onOpen} disabled={isPending} />
          <div className="hidden shrink-0 items-center gap-1 sm:flex">
            {issue.epicTitle && (
              <span className="flex items-center gap-0.5 rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400">
                <Zap className="size-2.5" />{issue.epicTitle}
              </span>
            )}
            {issue.subTaskCount > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <GitBranch className="size-2.5" />{issue.subTaskCount}
              </span>
            )}
          </div>
        </div>
      </td>
      {cols.priority && (
        <td className="w-24 px-2 py-2.5">
          <InlineSelect value={issue.priority} onSave={(v) => onUpdateField(issue.id, "priority", v)}
            disabled={isPending}
            options={ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => ({ value, label, icon: Icon, color }))}
            trigger={
              <span className="flex items-center gap-1">
                <PriorityIcon className={cn("size-3.5", priority.color)} />
                <span className="hidden text-xs text-muted-foreground lg:block">{priority.label}</span>
              </span>
            }
          />
        </td>
      )}
      {cols.status && (
        <td className="w-32 px-2 py-2.5">
          <InlineSelect value={issue.status} onSave={(v) => onUpdateField(issue.id, "status", v)}
            disabled={isPending}
            options={ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => ({ value, label, icon: Icon, color }))}
            trigger={
              <span className="flex items-center gap-1">
                <StatusIcon className={cn("size-3.5", status.color)} />
                <span className="text-xs text-muted-foreground">{status.label}</span>
              </span>
            }
          />
        </td>
      )}
      {cols.assignee && (
        <td className="w-32 px-2 py-2.5">
          <AssigneeCell issue={issue} members={members} onSave={onUpdateAssignee} disabled={isPending} />
        </td>
      )}
      {cols.dueDate && (
        <td className="w-28 px-2 py-2.5">
          <DueDateCell issue={issue} onSave={onUpdateDueDate} disabled={isPending} />
        </td>
      )}
      {cols.estimate && (
        <td className="w-20 px-2 py-2.5">
          <EstimateCell issue={issue} onSave={onUpdateEstimate} disabled={isPending} />
        </td>
      )}
      {cols.sprint && (
        <td className="w-28 px-3 py-2.5">
          {issue.sprintName
            ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{issue.sprintName}</span>
            : <span className="text-xs text-muted-foreground/40">—</span>}
        </td>
      )}
      {cols.comments && (
        <td className="w-16 px-3 py-2.5">
          {issue.commentCount > 0
            ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><MessageSquare className="size-3" />{issue.commentCount}</span>
            : <span className="text-xs text-muted-foreground/30">—</span>}
        </td>
      )}
      {cols.created && (
        <td className="w-28 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">{formatDate(issue.createdAt)}</span>
        </td>
      )}
      {cols.updated && (
        <td className="w-28 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">{formatDate(issue.updatedAt)}</span>
        </td>
      )}
      <td className="w-10 px-2 py-2.5">
        <button type="button" onClick={() => onOpen(issue.id)}
          className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100">
          <MoreHorizontal className="size-3.5" />
        </button>
      </td>
    </motion.tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueListClient({
  project, issues: initialIssues, members, sprints, epics,
  currentUserId, currentUserName, currentUserImage,
  workspaceSlug, workspaceId,
}: IssueListClientProps) {
  const router = useRouter();
  const [issues, setIssues]           = useState(initialIssues);
  const [filters, setFilters]         = useState<Filters>({
    search: "", status: "", priority: "", type: "", assignee: "", sprint: "", epic: "",
  });
  const [sortField, setSortField]     = useState<SortField>("createdAt");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");
  const [cols, setCols]               = useState<VisibleCols>(DEFAULT_COLS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail]         = useState<IssueDetail | null>(null);
  const [isLoadingDetail, startDetailTransition] = useTransition();
  const [isPending, startTransition]             = useTransition();
  const [isBulkPending, startBulkTransition]     = useTransition();

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = issues;
    const q = filters.search.toLowerCase().trim();
    if (q) result = result.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      `${project.key}-${i.key}`.toLowerCase().includes(q),
    );
    if (filters.status)   result = result.filter((i) => i.status   === filters.status);
    if (filters.priority) result = result.filter((i) => i.priority === filters.priority);
    if (filters.type)     result = result.filter((i) => i.type     === filters.type);
    if (filters.assignee === "unassigned") result = result.filter((i) => !i.assigneeId);
    else if (filters.assignee) result = result.filter((i) => i.assigneeId === filters.assignee);
    if (filters.sprint === "none") result = result.filter((i) => !i.sprintId);
    else if (filters.sprint) result = result.filter((i) => i.sprintId === filters.sprint);
    if (filters.epic === "none") result = result.filter((i) => !i.epicId);
    else if (filters.epic) result = result.filter((i) => i.epicId === filters.epic);
    return sortIssues(result, sortField, sortDir);
  }, [issues, filters, sortField, sortDir, project.key]);

  const hasFilters = Object.values(filters).some(Boolean);
  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  // ── Sort handler ──────────────────────────────────────────────────────────
  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function handleSelect(id: string, v: boolean) {
    setSelectedIds((prev) => { const n = new Set(prev); v ? n.add(id) : n.delete(id); return n; });
  }
  function handleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((i) => i.id)));
  }

  // ── Open issue detail ─────────────────────────────────────────────────────
  function handleOpenIssue(id: string) {
    setSelectedIssueId(id);
    startDetailTransition(async () => {
      const res = await fetch(`/api/issues/${id}`);
      if (res.ok) setIssueDetail(await res.json());
    });
  }

  // ── Inline field updates ──────────────────────────────────────────────────
  const handleUpdateTitle = useCallback((id: string, title: string) => {
    startTransition(async () => {
      const r = await updateIssue(id, { title });
      if (r.success) setIssues((prev) => prev.map((i) => i.id === id ? { ...i, title } : i));
    });
  }, []);

  const handleUpdateField = useCallback((id: string, field: string, value: string) => {
    startTransition(async () => {
      const r = await updateIssue(id, { [field]: value } as never);
      if (r.success) {
        setIssues((prev) => prev.map((i) => {
          if (i.id !== id) return i;
          const updated = { ...i, [field]: value };
          if (field === "assigneeId") {
            updated.assignee = value ? (members.find((m) => m.id === value) ?? null) : null;
          }
          return updated;
        }));
      }
    });
  }, [members]);

  const handleUpdateAssignee = useCallback((id: string, assigneeId: string | null) => {
    startTransition(async () => {
      const r = await updateIssue(id, { assigneeId });
      if (r.success) {
        setIssues((prev) => prev.map((i) => i.id !== id ? i : {
          ...i, assigneeId,
          assignee: assigneeId ? (members.find((m) => m.id === assigneeId) ?? null) : null,
        }));
      }
    });
  }, [members]);

  const handleUpdateDueDate = useCallback((id: string, dueDate: Date | null) => {
    startTransition(async () => {
      const r = await updateIssue(id, { dueDate });
      if (r.success) setIssues((prev) => prev.map((i) => i.id === id ? { ...i, dueDate } : i));
    });
  }, []);

  const handleUpdateEstimate = useCallback((id: string, estimate: number | null) => {
    startTransition(async () => {
      const r = await updateIssue(id, { estimate });
      if (r.success) setIssues((prev) => prev.map((i) => i.id === id ? { ...i, estimate } : i));
    });
  }, []);

  // ── Bulk update ───────────────────────────────────────────────────────────
  function handleBulkUpdate(field: string, value: string | null) {
    startBulkTransition(async () => {
      const r = await bulkUpdateIssues({
        issueIds: Array.from(selectedIds),
        ...(field === "status"     && { status:     value as never }),
        ...(field === "priority"   && { priority:   value as never }),
        ...(field === "assigneeId" && { assigneeId: value }),
      });
      if (r.success) {
        setIssues((prev) => prev.map((i) => !selectedIds.has(i.id) ? i : {
          ...i,
          ...(field === "status"     && { status:     value as string }),
          ...(field === "priority"   && { priority:   value as string }),
          ...(field === "assigneeId" && {
            assigneeId: value,
            assignee: value ? (members.find((m) => m.id === value) ?? null) : null,
          }),
        }));
        setSelectedIds(new Set());
      }
    });
  }

  // ── Column toggle ─────────────────────────────────────────────────────────
  function toggleCol(key: keyof VisibleCols) {
    setCols((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const colCount = Object.values(cols).filter(Boolean).length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search issues…"
              className="h-8 pl-8 text-xs"
            />
            {filters.search && (
              <button onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <Select value={filters.status || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
            <SelectTrigger className={cn("h-8 w-32 text-xs", filters.status && "border-primary text-primary")}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2 text-xs"><Icon className={cn("size-3.5", color)} />{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={filters.priority || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, priority: v === "all" ? "" : v }))}>
            <SelectTrigger className={cn("h-8 w-32 text-xs", filters.priority && "border-primary text-primary")}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2 text-xs"><Icon className={cn("size-3.5", color)} />{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee filter */}
          <Select value={filters.assignee || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, assignee: v === "all" ? "" : v }))}>
            <SelectTrigger className={cn("h-8 w-36 text-xs", filters.assignee && "border-primary text-primary")}>
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2 text-xs">
                    <Avatar className="size-4"><AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback></Avatar>
                    {m.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={filters.type || "all"} onValueChange={(v) => setFilters((f) => ({ ...f, type: v === "all" ? "" : v }))}>
            <SelectTrigger className={cn("h-8 w-28 text-xs", filters.type && "border-primary text-primary")}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2 text-xs"><Icon className={cn("size-3.5", color)} />{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          <AnimatePresence>
            {hasFilters && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs text-muted-foreground"
                  onClick={() => setFilters({ search: "", status: "", priority: "", type: "", assignee: "", sprint: "", epic: "" })}>
                  <RotateCcw className="size-3.5" />Clear
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="size-3.5" />
                Columns
                {colCount < Object.keys(DEFAULT_COLS).length && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {colCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(DEFAULT_COLS) as (keyof VisibleCols)[]).map((key) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={cols[key]}
                  onCheckedChange={() => toggleCol(key)}
                  className="text-xs capitalize"
                >
                  {key === "dueDate" ? "Due date" : key === "comments" ? "Comments" : key === "created" ? "Created" : key === "updated" ? "Updated" : key}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create issue */}
          <CreateIssueDialog
            projectId={project.id}
            projectKey={project.key}
            workspaceSlug={workspaceSlug}
            members={members}
            onCreated={() => router.refresh()}
          />
        </div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/20 px-5 py-2 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{filtered.length}</strong>
          {filtered.length !== issues.length && ` of ${issues.length}`} issues
        </span>
        {selectedCount > 0 && (
          <span className="text-primary font-medium">{selectedCount} selected</span>
        )}
        {isPending && <Loader2 className="size-3.5 animate-spin" />}
      </div>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-b border-primary/20 bg-primary/5 px-5 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-primary">{selectedCount} selected</span>
              <div className="h-3 w-px bg-border" />

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

              <Select onValueChange={(v) => handleBulkUpdate("assigneeId", v === "none" ? null : v)} disabled={isBulkPending}>
                <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Assign to…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2 text-xs">
                        <Avatar className="size-4"><AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback></Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isBulkPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2 text-xs"
                onClick={() => setSelectedIds(new Set())}>
                <X className="size-3.5" />Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/60">
              <Filter className="size-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {hasFilters ? "No issues match your filters" : "No issues yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasFilters
                ? "Try adjusting or clearing your filters."
                : "Create your first issue to get started."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => setFilters({ search: "", status: "", priority: "", type: "", assignee: "", sprint: "", epic: "" })}>
                <RotateCcw className="size-3.5" />Clear filters
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
              <tr className="border-b border-border">
                {/* Select all */}
                <th className="w-10 px-3 py-2.5">
                  <button type="button" onClick={handleSelectAll}
                    className="text-muted-foreground transition-colors hover:text-primary">
                    {allSelected
                      ? <SquareCheck className="size-4 text-primary" />
                      : <Square className="size-4" />}
                  </button>
                </th>
                <SortHeader field="key" label="Key" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20" />
                {cols.type && <th className="w-10 px-2 py-2.5 text-left text-xs font-semibold text-muted-foreground">Type</th>}
                <SortHeader field="title" label="Title" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                {cols.priority && <SortHeader field="priority" label="Priority" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-24" />}
                {cols.status   && <SortHeader field="status"   label="Status"   sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-32" />}
                {cols.assignee && <SortHeader field="assignee" label="Assignee" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-32" />}
                {cols.dueDate  && <SortHeader field="dueDate"  label="Due date" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-28" />}
                {cols.estimate && <SortHeader field="estimate" label="Points"   sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-20" />}
                {cols.sprint   && <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Sprint</th>}
                {cols.comments && <th className="w-16 px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">Comments</th>}
                {cols.created  && <SortHeader field="createdAt" label="Created" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-28" />}
                {cols.updated  && <SortHeader field="updatedAt" label="Updated" sortField={sortField} sortDir={sortDir} onSort={handleSort} className="w-28" />}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue, i) => (
                <IssueTableRow
                  key={issue.id}
                  issue={issue}
                  index={i}
                  projectKey={project.key}
                  members={members}
                  cols={cols}
                  selected={selectedIds.has(issue.id)}
                  onSelect={handleSelect}
                  onOpen={handleOpenIssue}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateField={handleUpdateField}
                  onUpdateAssignee={handleUpdateAssignee}
                  onUpdateDueDate={handleUpdateDueDate}
                  onUpdateEstimate={handleUpdateEstimate}
                  isPending={isPending}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Issue detail modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIssueId && (
          isLoadingDetail ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : issueDetail ? (
            <IssueDetailModal
              issue={issueDetail}
              projectKey={project.key}
              members={members}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserImage={currentUserImage}
              workspaceSlug={workspaceSlug}
              onClose={() => { setSelectedIssueId(null); setIssueDetail(null); }}
              onDeleted={() => {
                setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
                setSelectedIssueId(null);
                setIssueDetail(null);
              }}
            />
          ) : null
        )}
      </AnimatePresence>
    </div>
  );
}
