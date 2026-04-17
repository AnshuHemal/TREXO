"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  getStatusConfig,
  getPriorityConfig,
  getTypeConfig,
} from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { CreateIssueDialog } from "../../issues/_components/create-issue-dialog";
import { IssueDetailModal, type IssueDetail } from "../../issues/_components/issue-detail-modal";
import { prisma } from "@/lib/prisma";

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
  createdAt: Date;
  updatedAt: Date;
  commentCount: number;
}

interface BacklogClientProps {
  project: { id: string; name: string; key: string };
  issues: IssueRow[];
  members: Member[];
  currentUserId: string;
  workspaceSlug: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 hover:bg-accent/30 transition-colors"
    >
      {/* Priority */}
      <PriorityIcon className={cn("size-4 shrink-0", priority.color)} />

      {/* Type */}
      <TypeIcon className={cn("size-4 shrink-0", type.color)} />

      {/* Key */}
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {projectKey}-{issue.key}
      </span>

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
        {issue.title}
      </span>

      {/* Status badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
      </div>

      {/* Comment count */}
      {issue.commentCount > 0 && (
        <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {issue.commentCount}
        </div>
      )}

      {/* Assignee */}
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
  workspaceSlug: _workspaceSlug,
}: BacklogClientProps) {
  const [issues, setIssues] = useState(initialIssues);
  const [search, setSearch] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issueDetail, setIssueDetail] = useState<IssueDetail | null>(null);
  const [isLoadingDetail, startDetailTransition] = useTransition();

  const filtered = issues.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    `${project.key}-${i.key}`.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleOpenIssue(issueId: string) {
    setSelectedIssueId(issueId);
    startDetailTransition(async () => {
      // Fetch full issue detail including comments and activities
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
    if (selectedIssueId) {
      setIssues((prev) => prev.filter((i) => i.id !== selectedIssueId));
    }
    handleCloseModal();
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search issues…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-56 pl-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <SlidersHorizontal className="size-3.5" />
            Filter
          </Button>
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
              {search ? "No issues match your search." : "No issues yet. Create your first issue to get started."}
            </p>
            {!search && (
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
              <IssueRow
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
              <div className="flex size-12 items-center justify-center rounded-xl bg-card">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                >
                  <Search className="size-5 text-primary" />
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <IssueDetailModal
              key="detail"
              issue={issueDetail}
              projectKey={project.key}
              members={members}
              currentUserId={currentUserId}
              onClose={handleCloseModal}
              onDeleted={handleIssueDeleted}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
