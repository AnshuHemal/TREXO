"use client";

import { useState, useTransition, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Trash2, Loader2, XCircle, Send, MessageSquare,
  Clock, CalendarDays, Zap, ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  ISSUE_TYPES, ISSUE_STATUSES, ISSUE_PRIORITIES,
  formatActivityType, formatActivityValue,
  getStatusConfig, getPriorityConfig,
} from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import {
  updateIssue, deleteIssue,
  addComment, editComment, deleteComment,
  addLabelToIssue, removeLabelFromIssue,
} from "../../actions";
import { LabelPicker, type LabelOption } from "@/components/shared/label-picker";
import { isOverdue, toInputDate, fromInputDate, getDueDateLabel, isDueThisWeek } from "@/lib/due-date";
import { SubTaskList, type SubTaskItem } from "../../_components/sub-task-list";
import { IssueLinks } from "../../_components/issue-links";
import type { IssueLinkItem } from "../../link-actions";
import { FadeIn } from "@/components/motion/fade-in";
import { CommentEntry, type CommentItem } from "../../_components/comment-entry";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string; email: string; image: string | null; }

interface ActivityItem {
  id: string; type: string; fromValue: string | null; toValue: string | null;
  createdAt: Date;
  actor: { id: string; name: string; image: string | null };
}

type TimelineEntry =
  | { kind: "activity"; data: ActivityItem }
  | { kind: "comment";  data: CommentItem };

interface IssueData {
  id: string; key: number; title: string; description: string | null;
  type: string; status: string; priority: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  dueDate?: Date | null; estimate?: number | null;
  createdAt: Date; updatedAt: Date;
  comments: CommentItem[];
  activities: ActivityItem[];
  labels?: { label: LabelOption }[];
  subTasks?: SubTaskItem[];
  parent?: { id: string; key: number; title: string; project: { key: string } } | null;
  projectId?: string;
  links?: IssueLinkItem[];
}

interface IssueDetailPageProps {
  issue: IssueData;
  project: { id: string; name: string; key: string };
  members: Member[];
  allLabels: LabelOption[];
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

function formatRelative(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

// ─── Estimate field ───────────────────────────────────────────────────────────

const ESTIMATE_OPTIONS = [
  { value: 1, label: "1", size: "XS" },
  { value: 2, label: "2", size: "S"  },
  { value: 3, label: "3", size: "M"  },
  { value: 5, label: "5", size: "L"  },
  { value: 8, label: "8", size: "XL" },
  { value: 13, label: "13", size: "XXL" },
];

function EstimateField({
  value, onChange, disabled,
}: { value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ESTIMATE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            value === opt.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          <Zap className="size-2.5" />
          {opt.label}
          <span className="text-[10px] opacity-60">{opt.size}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar field ────────────────────────────────────────────────────────────

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// ─── Activity entry ───────────────────────────────────────────────────────────

function ActivityEntry({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="mt-0.5 size-6 shrink-0">
        <AvatarImage src={activity.actor.image ?? undefined} />
        <AvatarFallback className="text-[10px]">{getInitials(activity.actor.name)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-wrap items-baseline gap-1 text-xs text-muted-foreground min-w-0">
        <span className="font-medium text-foreground">{activity.actor.name}</span>
        <span>{formatActivityType(activity.type)}</span>
        {activity.fromValue && activity.toValue && (
          <>
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
              {formatActivityValue(activity.fromValue)}
            </span>
            <span>→</span>
            <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
              {formatActivityValue(activity.toValue)}
            </span>
          </>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/60">
          {formatRelative(activity.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueDetailPage({
  issue: initialIssue,
  project,
  members,
  allLabels,
  currentUserId,
  currentUserName,
  currentUserImage,
  workspaceSlug,
}: IssueDetailPageProps) {
  const router = useRouter();

  const [issue, setIssue]               = useState(initialIssue);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft]     = useState(issue.title);
  const [description, setDescription]  = useState(issue.description ?? "");
  const [commentBody, setCommentBody]  = useState("");
  const [comments, setComments]        = useState<CommentItem[]>(issue.comments);
  const [activities]                   = useState<ActivityItem[]>(issue.activities);
  const [selectedLabels, setSelectedLabels] = useState<LabelOption[]>(
    (issue.labels ?? []).map((il) => il.label),
  );
  const [dueDate, setDueDate]          = useState<Date | null>(issue.dueDate ?? null);
  const [estimate, setEstimate]        = useState<number | null>(issue.estimate ?? null);
  const [subTasks, setSubTasks]        = useState<SubTaskItem[]>(issue.subTasks ?? []);
  const [links]                        = useState<IssueLinkItem[]>(() => {
    const out = issue as IssueData & {
      outgoingLinks?: Array<{ id: string; type: string; target: IssueLinkItem["issue"] }>;
      incomingLinks?: Array<{ id: string; type: string; source: IssueLinkItem["issue"] }>;
    };
    const result: IssueLinkItem[] = [];
    for (const l of out.outgoingLinks ?? []) {
      result.push({ id: l.id, type: l.type as IssueLinkItem["type"], issue: l.target });
    }
    for (const l of out.incomingLinks ?? []) {
      const flipped = l.type === "BLOCKS" ? "BLOCKED_BY" : l.type === "BLOCKED_BY" ? "BLOCKS" : l.type;
      result.push({ id: l.id, type: flipped as IssueLinkItem["type"], issue: l.source });
    }
    return issue.links ?? result;
  });

  const [error, setError]              = useState<string | null>(null);
  const [isPending, startTransition]   = useTransition();
  const [isSubmittingComment, startCommentTransition] = useTransition();
  const [isSavingDesc, startDescTransition]           = useTransition();

  const issueKey = `${project.key}-${issue.key}`;

  // ── Timeline ──────────────────────────────────────────────────────────────────

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [
      ...activities.map((a) => ({ kind: "activity" as const, data: a })),
      ...comments.map((c) => ({ kind: "comment" as const, data: c })),
    ];
    return entries.sort(
      (a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime(),
    );
  }, [activities, comments]);

  // ── Field updates ─────────────────────────────────────────────────────────────

  function handleFieldUpdate(field: string, value: string | null) {
    startTransition(async () => {
      const result = await updateIssue(issue.id, { [field]: value } as never);
      if (!result.success) { setError(result.error ?? "Update failed."); return; }
      setIssue((prev) => ({ ...prev, [field]: value }));
      if (field === "assigneeId") {
        const member = members.find((m) => m.id === value) ?? null;
        setIssue((prev) => ({ ...prev, assignee: member }));
      }
      setError(null);
    });
  }

  function handleTitleSave() {
    if (titleDraft.trim() === issue.title) { setIsEditingTitle(false); return; }
    startTransition(async () => {
      const result = await updateIssue(issue.id, { title: titleDraft });
      if (!result.success) { setError(result.error ?? "Update failed."); return; }
      setIssue((prev) => ({ ...prev, title: titleDraft.trim() }));
      setIsEditingTitle(false);
      setError(null);
    });
  }

  const handleDescriptionSave = useCallback(() => {
    startDescTransition(async () => {
      await updateIssue(issue.id, { description });
      // Notify any @mentioned users in the description
      if (description) {
        const { notifyMentioned } = await import("@/lib/notifications");
        notifyMentioned({ html: description, actorId: currentUserId, issueId: issue.id }).catch(() => {});
      }
    });
  }, [issue.id, description, currentUserId]);

  // ── Comments ──────────────────────────────────────────────────────────────────

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    startCommentTransition(async () => {
      const result = await addComment(issue.id, commentBody);
      if (!result.success) { setError(result.error ?? "Failed to add comment."); return; }
      setComments((prev) => [
        ...prev,
        {
          id: result.data!.id,
          body: commentBody,
          createdAt: new Date(),
          author: { id: currentUserId, name: currentUserName ?? "You", image: currentUserImage ?? null },
        },
      ]);
      setCommentBody("");
      setError(null);
    });
  }

  function handleEditComment(commentId: string, body: string) {
    startTransition(async () => {
      const result = await editComment(commentId, body);
      if (!result.success) { setError(result.error ?? "Failed to edit comment."); return; }
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body, updatedAt: new Date() } : c));
      setError(null);
    });
  }

  function handleDeleteComment(commentId: string) {
    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (!result.success) { setError(result.error ?? "Failed to delete comment."); return; }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    });
  }

  // ── Delete issue ──────────────────────────────────────────────────────────────

  function handleDeleteIssue() {
    startTransition(async () => {
      const result = await deleteIssue(issue.id);
      if (!result.success) { setError(result.error ?? "Failed to delete issue."); return; }
      router.push(`/workspace/${workspaceSlug}/projects/${project.key}/backlog`);
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* Breadcrumb + actions */}
        <FadeIn direction="down" className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
            <ChevronRight className="size-3.5" />
            <span>{project.name}</span>
            <ChevronRight className="size-3.5" />
            {issue.parent && (
              <>
                <a
                  href={`/workspace/${workspaceSlug}/projects/${project.key}/issues/${issue.parent.key}`}
                  className="font-mono hover:text-primary transition-colors"
                >
                  {issue.parent.project.key}-{issue.parent.key}
                </a>
                <ChevronRight className="size-3.5" />
              </>
            )}
            <span className="font-mono font-medium text-foreground">{issueKey}</span>
          </div>

          {/* Delete */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete issue</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete <strong>{issueKey}</strong> and all its comments. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="destructive" onClick={handleDeleteIssue} disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FadeIn>

        {/* Main layout: content + sidebar */}
        <div className="flex gap-8">

          {/* ── Left: main content ─────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">

            {/* Issue key + type badge */}
            <FadeIn delay={0.04}>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const typeConf = ISSUE_TYPES.find((t) => t.value === issue.type);
                  if (!typeConf) return null;
                  const Icon = typeConf.icon;
                  return (
                    <span className={cn("flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium", typeConf.color)}>
                      <Icon className="size-3.5" />
                      {typeConf.label}
                    </span>
                  );
                })()}
                <span className="font-mono text-sm text-muted-foreground">{issueKey}</span>

                {/* Overdue / due-soon badge in header */}
                {dueDate && !["DONE", "CANCELLED"].includes(issue.status) && (() => {
                  const label = getDueDateLabel(dueDate, issue.status);
                  const overdueBadge = isOverdue(dueDate, issue.status);
                  const dueSoonBadge = !overdueBadge && isDueThisWeek(dueDate, issue.status);
                  if (!label || (!overdueBadge && !dueSoonBadge)) return null;
                  return (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        overdueBadge
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      )}
                    >
                      <CalendarDays className="size-3.5" />
                      {label}
                    </motion.span>
                  );
                })()}
              </div>
            </FadeIn>

            {/* Title */}
            <FadeIn delay={0.06}>
              {isEditingTitle ? (
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") { setTitleDraft(issue.title); setIsEditingTitle(false); }
                  }}
                  autoFocus
                  className="text-2xl font-bold h-auto border-0 border-b border-primary rounded-none px-0 shadow-none focus-visible:ring-0 bg-transparent"
                  disabled={isPending}
                />
              ) : (
                <h1
                  className="cursor-text rounded-md px-1 -mx-1 py-0.5 text-2xl font-bold leading-tight text-foreground transition-colors hover:bg-accent/50"
                  onClick={() => { setTitleDraft(issue.title); setIsEditingTitle(true); }}
                >
                  {issue.title}
                </h1>
              )}
            </FadeIn>

            {/* Description */}
            <FadeIn delay={0.08}>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <div className="rounded-xl border border-border bg-card p-4">
                  <RichTextEditor
                    content={description}
                    onChange={setDescription}
                    onBlur={handleDescriptionSave}
                    placeholder="Add a description… (@ to mention)"
                    minHeight="120px"
                    members={members}
                  />
                  {isSavingDesc && (
                    <span className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Saving…
                    </span>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Sub-tasks */}
            {!issue.parent && issue.projectId && (
              <FadeIn delay={0.1}>
                <div className="rounded-xl border border-border bg-card p-4">
                  <SubTaskList
                    parentId={issue.id}
                    projectId={issue.projectId}
                    projectKey={project.key}
                    subTasks={subTasks}
                    onOpenSubTask={(id) => {
                      const sub = subTasks.find((s) => s.id === id);
                      if (sub) {
                        window.location.href = `/workspace/${workspaceSlug}/projects/${project.key}/issues/${sub.key}`;
                      }
                    }}
                  />
                </div>
              </FadeIn>
            )}

            {/* Linked issues */}
            {issue.projectId && (
              <FadeIn delay={0.12}>
                <div className="rounded-xl border border-border bg-card p-4">
                  <IssueLinks
                    issueId={issue.id}
                    projectId={issue.projectId}
                    initialLinks={links}
                    onOpenIssue={(id) => {
                      // Navigate to the linked issue's full page
                      // We need to find the key from the links list
                      const link = links.find((l) => l.issue.id === id);
                      if (link) {
                        window.location.href = `/workspace/${workspaceSlug}/projects/${link.issue.project.key}/issues/${link.issue.key}`;
                      }
                    }}
                  />
                </div>
              </FadeIn>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <XCircle className="size-4 shrink-0" />{error}
                  <button onClick={() => setError(null)} className="ml-auto"><XCircle className="size-3.5" /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Activity + comments */}
            <FadeIn delay={0.14}>
              <div className="flex flex-col gap-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="size-4" />
                  Activity
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {timeline.length} {timeline.length === 1 ? "entry" : "entries"}
                  </span>
                </h3>

                {timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <AnimatePresence initial={false}>
                      {timeline.map((entry) =>
                        entry.kind === "activity" ? (
                          <motion.div
                            key={`activity-${entry.data.id}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ActivityEntry activity={entry.data} />
                          </motion.div>
                        ) : (
                          <div key={`comment-${entry.data.id}`} className="group">
                            <CommentEntry
                              comment={entry.data}
                              currentUserId={currentUserId}
                              members={members}
                              onEdit={handleEditComment}
                              onDelete={handleDeleteComment}
                            />
                          </div>
                        ),
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Add comment */}
                <form onSubmit={handleAddComment} className="flex items-start gap-2.5 pt-1">
                  <Avatar className="mt-1 size-7 shrink-0">
                    <AvatarImage src={currentUserImage ?? undefined} />
                    <AvatarFallback className="text-[10px]">{getInitials(currentUserName ?? "Me")}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="rounded-xl border border-border bg-card">
                      <RichTextEditor
                        content={commentBody}
                        onChange={setCommentBody}
                        placeholder="Add a comment… (@ to mention)"
                        minHeight="72px"
                        showToolbar={false}
                        members={members}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button" variant="ghost" size="sm" className="h-7 px-2.5 text-xs"
                        onClick={() => setCommentBody("")}
                        disabled={!commentBody.trim() || isSubmittingComment}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit" size="sm" className="h-7 px-2.5 text-xs"
                        disabled={!commentBody.trim() || isSubmittingComment}
                      >
                        {isSubmittingComment
                          ? <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />Saving…</span>
                          : <span className="flex items-center gap-1.5"><Send className="size-3.5" />Comment</span>
                        }
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </FadeIn>
          </div>

          {/* ── Right: sidebar ─────────────────────────────────────────────── */}
          <FadeIn delay={0.05} className="w-64 shrink-0">
            <div className="sticky top-6 flex flex-col gap-5 rounded-xl border border-border bg-card p-5">

              <SidebarField label="Status">
                <Select value={issue.status} onValueChange={(v) => handleFieldUpdate("status", v)} disabled={isPending}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
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
              </SidebarField>

              <SidebarField label="Priority">
                <Select value={issue.priority} onValueChange={(v) => handleFieldUpdate("priority", v)} disabled={isPending}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
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
              </SidebarField>

              <SidebarField label="Type">
                <Select value={issue.type} onValueChange={(v) => handleFieldUpdate("type", v)} disabled={isPending}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2 text-xs">
                          <Icon className={cn("size-3.5", color)} />{label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SidebarField>

              <SidebarField label="Assignee">
                <Select
                  value={issue.assigneeId ?? "none"}
                  onValueChange={(v) => handleFieldUpdate("assigneeId", v === "none" ? null : v)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Unassigned" />
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
              </SidebarField>

              <Separator />

              <SidebarField label="Labels">
                <LabelPicker
                  issueId={issue.id}
                  allLabels={allLabels}
                  selectedLabels={selectedLabels}
                  onAdd={async (labelId) => {
                    const result = await addLabelToIssue(issue.id, labelId);
                    if (result.success) {
                      const label = allLabels.find((l) => l.id === labelId);
                      if (label) setSelectedLabels((prev) => [...prev, label]);
                    }
                  }}
                  onRemove={async (labelId) => {
                    const result = await removeLabelFromIssue(issue.id, labelId);
                    if (result.success) {
                      setSelectedLabels((prev) => prev.filter((l) => l.id !== labelId));
                    }
                  }}
                  disabled={isPending}
                />
              </SidebarField>

              <Separator />

              <SidebarField label="Due date">
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={toInputDate(dueDate)}
                    onChange={(e) => {
                      const newDate = fromInputDate(e.target.value);
                      setDueDate(newDate);
                      startTransition(async () => {
                        await updateIssue(issue.id, { dueDate: newDate });
                      });
                    }}
                    disabled={isPending}
                    className="h-8 flex-1 text-xs"
                  />
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setDueDate(null);
                        startTransition(async () => { await updateIssue(issue.id, { dueDate: null }); });
                      }}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XCircle className="size-3.5" />
                    </button>
                  )}
                </div>
                {dueDate && isOverdue(dueDate, issue.status) && (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive"
                  >
                    <CalendarDays className="size-3" />
                    {getDueDateLabel(dueDate, issue.status)}
                  </motion.span>
                )}
                {dueDate && !isOverdue(dueDate, issue.status) && isDueThisWeek(dueDate, issue.status) && (
                  <motion.span
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
                  >
                    <CalendarDays className="size-3" />
                    {getDueDateLabel(dueDate, issue.status)}
                  </motion.span>
                )}
              </SidebarField>

              <Separator />

              <SidebarField label="Estimate">
                <EstimateField
                  value={estimate}
                  disabled={isPending}
                  onChange={(val) => {
                    setEstimate(val);
                    startTransition(async () => { await updateIssue(issue.id, { estimate: val }); });
                  }}
                />
              </SidebarField>

              <Separator />

              <SidebarField label="Reporter">
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={issue.reporter.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">{getInitials(issue.reporter.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-foreground">{issue.reporter.name}</span>
                </div>
              </SidebarField>

              <SidebarField label="Created">
                <span className="text-xs text-muted-foreground">{formatDate(issue.createdAt)}</span>
              </SidebarField>

              <SidebarField label="Updated">
                <span className="text-xs text-muted-foreground">{formatDate(issue.updatedAt)}</span>
              </SidebarField>

            </div>
          </FadeIn>
        </div>
      </div>
    </main>
  );
}
