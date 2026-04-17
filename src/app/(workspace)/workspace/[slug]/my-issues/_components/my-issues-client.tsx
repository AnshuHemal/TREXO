"use client";

import { useState, useTransition, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Search, CircleUser,
  ChevronDown,
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
  getStatusConfig,
  getPriorityConfig,
  getTypeConfig,
} from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { IssueDetailModal, type IssueDetail } from "../../projects/[key]/issues/_components/issue-detail-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface MyIssue {
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
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
  project: { id: string; name: string; key: string };
}

interface MyIssuesClientProps {
  issues: MyIssue[];
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

const OPEN_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"]);

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({
  issue,
  index,
  onClick,
}: {
  issue: MyIssue;
  index: number;
  onClick: () => void;
}) {
  const status   = getStatusConfig(issue.status);
  const priority = getPriorityConfig(issue.priority);
  const type     = getTypeConfig(issue.type);

  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;

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

      {/* Issue key */}
      <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
        {issue.project.key}-{issue.key}
      </span>

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
        {issue.title}
      </span>

      {/* Status */}
      <div className="flex shrink-0 items-center gap-1.5">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>

      {/* Comment count */}
      {issue.commentCount > 0 && (
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {issue.commentCount}
        </div>
      )}

      {/* Assignee avatar */}
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

// ─── Project group ────────────────────────────────────────────────────────────

function ProjectGroup({
  project,
  issues,
  groupIndex,
  onOpenIssue,
}: {
  project: { id: string; name: string; key: string };
  issues: MyIssue[];
  groupIndex: number;
  onOpenIssue: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: groupIndex * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-2"
    >
      {/* Group header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="flex items-center gap-2.5 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/40"
      >
        <motion.span
          animate={{ rotate: isExpanded ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="size-4" />
        </motion.span>

        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
          {project.key.charAt(0)}
        </div>

        <span className="text-sm font-semibold text-foreground">{project.name}</span>

        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {issues.length}
        </span>
      </button>

      {/* Issues */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-1.5 pl-4"
          >
            {issues.map((issue, i) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                index={i}
                onClick={() => onOpenIssue(issue.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MyIssuesClient({
  issues,
  members,
  currentUserId,
  currentUserName,
  currentUserImage,
}: MyIssuesClientProps) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail]         = useState<IssueDetail | null>(null);
  const [isLoadingDetail, startDetailTransition] = useTransition();

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      const matchesStatus =
        statusFilter === "all" || OPEN_STATUSES.has(i.status);

      const matchesSearch =
        !search ||
        i.title.toLowerCase().includes(search.toLowerCase()) ||
        `${i.project.key}-${i.key}`.toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [issues, statusFilter, search]);

  // ── Group by project ──────────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, { project: MyIssue["project"]; issues: MyIssue[] }>();
    for (const issue of filtered) {
      const key = issue.project.id;
      if (!map.has(key)) map.set(key, { project: issue.project, issues: [] });
      map.get(key)!.issues.push(issue);
    }
    return Array.from(map.values());
  }, [filtered]);

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

  // Find the project key for the selected issue (needed by the modal)
  const selectedIssue = issues.find((i) => i.id === selectedIssueId);

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
              placeholder="Search my issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 pl-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "open" | "all")}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Issue count */}
        <span className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
              <CircleUser className="size-8 text-primary" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              {search
                ? "No issues match your search"
                : statusFilter === "open"
                  ? "No open issues assigned to you"
                  : "No issues assigned to you"}
            </h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              {search
                ? "Try a different search term."
                : "Issues assigned to you will appear here."}
            </p>
            {(search || statusFilter !== "open") && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => { setSearch(""); setStatusFilter("open"); }}
              >
                Clear filters
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map(({ project, issues: projectIssues }, i) => (
              <ProjectGroup
                key={project.id}
                project={project}
                issues={projectIssues}
                groupIndex={i}
                onOpenIssue={handleOpenIssue}
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
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                className="size-8 rounded-full border-2 border-primary border-t-transparent"
              />
            </motion.div>
          ) : (
            <IssueDetailModal
              key="detail"
              issue={issueDetail}
              projectKey={selectedIssue?.project.key ?? ""}
              members={members}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserImage={currentUserImage}
              onClose={handleCloseModal}
              onDeleted={() => {
                // Remove from local list and close
                handleCloseModal();
              }}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
