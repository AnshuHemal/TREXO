"use client";

import { useState, useTransition, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Trash2, Loader2, XCircle, Send, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import {
  ISSUE_TYPES, ISSUE_STATUSES, ISSUE_PRIORITIES,
  formatActivityType,
} from "@/lib/issue-config";
import { cn } from "@/lib/utils";
import { updateIssue, deleteIssue, addComment, deleteComment } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface Comment {
  id: string;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; image: string | null };
}

interface Activity {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: Date;
  actor: { id: string; name: string; image: string | null };
}

export interface IssueDetail {
  id: string;
  key: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  reporter: { id: string; name: string; image: string | null };
  createdAt: Date;
  updatedAt: Date;
  comments: Comment[];
  activities: Activity[];
}

interface IssueDetailModalProps {
  issue: IssueDetail;
  projectKey: string;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onDeleted: () => void;
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

// ─── Sidebar field ────────────────────────────────────────────────────────────

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IssueDetailModal({
  issue: initialIssue,
  projectKey,
  members,
  currentUserId,
  onClose,
  onDeleted,
}: IssueDetailModalProps) {
  const [issue, setIssue] = useState(initialIssue);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(issue.title);
  const [description, setDescription] = useState(issue.description ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [comments, setComments] = useState(issue.comments);
  const [activities] = useState(issue.activities);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSubmittingComment, startCommentTransition] = useTransition();
  const [isSavingDesc, startDescTransition] = useTransition();

  const issueKey = `${projectKey}-${issue.key}`;

  // ── Field updates ────────────────────────────────────────────────────────────

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

  async function handleTitleSave() {
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
    });
  }, [issue.id, description]);

  // ── Comments ─────────────────────────────────────────────────────────────────

  function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    startCommentTransition(async () => {
      const result = await addComment(issue.id, commentBody);
      if (!result.success) { setError(result.error ?? "Failed to add comment."); return; }
      // Optimistic: add comment to local state
      setComments((prev) => [
        ...prev,
        {
          id: result.data!.id,
          body: commentBody,
          createdAt: new Date(),
          author: { id: currentUserId, name: "You", image: null },
        },
      ]);
      setCommentBody("");
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

  // ── Delete issue ─────────────────────────────────────────────────────────────

  function handleDeleteIssue() {
    startTransition(async () => {
      const result = await deleteIssue(issue.id);
      if (!result.success) { setError(result.error ?? "Failed to delete issue."); return; }
      onDeleted();
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-16"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative flex w-full max-w-5xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <span className="font-mono text-sm font-medium text-muted-foreground">{issueKey}</span>
          <div className="flex items-center gap-1">
            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
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

            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — main content */}
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">

            {/* Title */}
            <div>
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") { setTitleDraft(issue.title); setIsEditingTitle(false); } }}
                    autoFocus
                    className="text-lg font-semibold"
                    disabled={isPending}
                  />
                </div>
              ) : (
                <h1
                  className="cursor-text text-xl font-semibold text-foreground hover:bg-accent/50 rounded px-1 -mx-1 py-0.5 transition-colors"
                  onClick={() => { setTitleDraft(issue.title); setIsEditingTitle(true); }}
                >
                  {issue.title}
                </h1>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                onBlur={handleDescriptionSave}
                placeholder="Add a description…"
                minHeight="100px"
              />
              {isSavingDesc && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> Saving…
                </span>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="size-4 shrink-0" />{error}
                </motion.div>
              )}
            </AnimatePresence>

            <Separator />

            {/* Activity + Comments */}
            <div className="flex flex-col gap-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MessageSquare className="size-4" />
                Activity
              </h3>

              {/* Timeline */}
              <div className="flex flex-col gap-3">
                {/* Activities */}
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-2.5 text-sm">
                    <Avatar className="size-6 mt-0.5 shrink-0">
                      <AvatarImage src={a.actor.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(a.actor.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-wrap items-baseline gap-1 text-muted-foreground">
                      <span className="font-medium text-foreground">{a.actor.name}</span>
                      <span>{formatActivityType(a.type)}</span>
                      {a.fromValue && a.toValue && (
                        <>
                          <span className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{a.fromValue}</span>
                          <span>→</span>
                          <span className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{a.toValue}</span>
                        </>
                      )}
                      <span className="text-xs">{formatRelative(a.createdAt)}</span>
                    </div>
                  </div>
                ))}

                {/* Comments */}
                {comments.map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5"
                  >
                    <Avatar className="size-6 mt-1 shrink-0">
                      <AvatarImage src={c.author.image ?? undefined} />
                      <AvatarFallback className="text-[10px]">{getInitials(c.author.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-foreground">{c.author.name}</span>
                          <span className="text-xs text-muted-foreground">{formatRelative(c.createdAt)}</span>
                        </div>
                        {c.author.id === currentUserId && (
                          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(c.id)}>
                            <X className="size-3" />
                          </Button>
                        )}
                      </div>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: c.body }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add comment */}
              <form onSubmit={handleAddComment} className="flex items-start gap-2.5">
                <Avatar className="size-6 mt-2 shrink-0">
                  <AvatarFallback className="text-[10px]">ME</AvatarFallback>
                </Avatar>
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <input
                    type="text"
                    placeholder="Add a comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    disabled={isSubmittingComment}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <Button type="submit" size="icon" variant="ghost" className="size-6 shrink-0 text-muted-foreground hover:text-primary"
                    disabled={!commentBody.trim() || isSubmittingComment}>
                    {isSubmittingComment ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Right — sidebar */}
          <div className="w-64 shrink-0 border-l border-border p-5 flex flex-col gap-5 overflow-y-auto">

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
        </div>
      </motion.div>
    </motion.div>
  );
}
