"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pencil, Check, Loader2, Trash2, SmilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { cn } from "@/lib/utils";
import { toggleCommentReaction } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentReaction {
  id: string;
  emoji: string;
  user: { id: string; name: string };
}

export interface CommentItem {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt?: Date;
  author: { id: string; name: string; image: string | null };
  reactions?: CommentReaction[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CommentEntryProps {
  comment: CommentItem;
  currentUserId: string;
  members: Member[];
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REACTION_EMOJIS = ["👍", "✅", "🎉", "❤️", "🚀", "👀"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

// ─── Reaction pill ────────────────────────────────────────────────────────────

function ReactionPill({
  emoji,
  reactions,
  currentUserId,
  commentId,
  onToggle,
}: {
  emoji: string;
  reactions: CommentReaction[];
  currentUserId: string;
  commentId: string;
  onToggle: (emoji: string, added: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hasReacted = reactions.some((r) => r.user.id === currentUserId);
  const count = reactions.length;

  const tooltipNames = reactions
    .slice(0, 5)
    .map((r) => r.user.name)
    .join(", ") + (reactions.length > 5 ? ` +${reactions.length - 5} more` : "");

  function handleClick() {
    startTransition(async () => {
      const result = await toggleCommentReaction(commentId, emoji);
      if (result.success && result.data !== undefined) {
        onToggle(emoji, result.data.added);
      }
    });
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={tooltipNames}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-all",
        "disabled:cursor-not-allowed disabled:opacity-60",
        hasReacted
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
      )}
    >
      <span>{emoji}</span>
      <motion.span
        key={count}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {count}
      </motion.span>
    </motion.button>
  );
}

// ─── Emoji picker ─────────────────────────────────────────────────────────────

function EmojiPicker({
  commentId,
  onToggle,
}: {
  commentId: string;
  onToggle: (emoji: string, added: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handlePick(emoji: string) {
    setOpen(false);
    startTransition(async () => {
      const result = await toggleCommentReaction(commentId, emoji);
      if (result.success && result.data !== undefined) {
        onToggle(emoji, result.data.added);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        title="Add reaction"
      >
        <SmilePlus className="size-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute bottom-full left-0 z-50 mb-1.5 flex items-center gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-xl"
            >
              {REACTION_EMOJIS.map((emoji) => (
                <motion.button
                  key={emoji}
                  type="button"
                  onClick={() => handlePick(emoji)}
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex size-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-accent"
                  title={emoji}
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommentEntry({
  comment,
  currentUserId,
  members,
  onEdit,
  onDelete,
}: CommentEntryProps) {
  const [isEditing, setIsEditing]   = useState(false);
  const [editBody, setEditBody]     = useState(comment.body);
  const [isPending, startTransition] = useTransition();
  const [reactions, setReactions]   = useState<CommentReaction[]>(comment.reactions ?? []);
  const [showActions, setShowActions] = useState(false);

  const isOwn = comment.author.id === currentUserId;
  const isEdited = comment.updatedAt &&
    new Date(comment.updatedAt).getTime() !== new Date(comment.createdAt).getTime();

  // Group reactions by emoji
  const grouped = REACTION_EMOJIS.reduce<Record<string, CommentReaction[]>>((acc, emoji) => {
    const group = reactions.filter((r) => r.emoji === emoji);
    if (group.length > 0) acc[emoji] = group;
    return acc;
  }, {});

  function handleReactionToggle(emoji: string, added: boolean) {
    setReactions((prev) => {
      if (added) {
        return [...prev, { id: `temp-${Date.now()}`, emoji, user: { id: currentUserId, name: "You" } }];
      }
      return prev.filter((r) => !(r.emoji === emoji && r.user.id === currentUserId));
    });
  }

  function handleSaveEdit() {
    if (!editBody.trim()) return;
    startTransition(async () => {
      onEdit(comment.id, editBody);
      setIsEditing(false);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex items-start gap-3"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar className="mt-0.5 size-7 shrink-0 ring-2 ring-background">
        <AvatarImage src={comment.author.image ?? undefined} />
        <AvatarFallback className="text-[10px] font-semibold">
          {getInitials(comment.author.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{comment.author.name}</span>
            <span className="text-xs text-muted-foreground/60">{formatRelative(comment.createdAt)}</span>
            {isEdited && (
              <span className="text-[10px] text-muted-foreground/40">(edited)</span>
            )}
          </div>

          {/* Action buttons — appear on hover */}
          <AnimatePresence>
            {showActions && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                className="flex items-center gap-0.5"
              >
                {/* Emoji picker */}
                <EmojiPicker
                  commentId={comment.id}
                  onToggle={handleReactionToggle}
                />

                {/* Edit — own comments only */}
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => { setEditBody(comment.body); setIsEditing(true); }}
                    className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Edit comment"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}

                {/* Delete — own comments only */}
                {isOwn && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Delete comment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete comment</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this comment. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={() => onDelete(comment.id)}>
                          Delete
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Body */}
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-col gap-2 overflow-hidden"
          >
            <RichTextEditor
              content={editBody}
              onChange={setEditBody}
              placeholder="Edit comment…"
              minHeight="60px"
              members={members}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm" className="h-7 px-2.5 text-xs"
                onClick={handleSaveEdit}
                disabled={isPending || !editBody.trim()}
              >
                {isPending
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <><Check className="mr-1 size-3" />Save</>
                }
              </Button>
              <Button
                size="sm" variant="ghost" className="h-7 px-2.5 text-xs"
                onClick={() => { setIsEditing(false); setEditBody(comment.body); }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm"
            dangerouslySetInnerHTML={{ __html: comment.body }}
          />
        )}

        {/* Reactions */}
        <AnimatePresence>
          {Object.keys(grouped).length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-wrap items-center gap-1.5 overflow-hidden"
            >
              {Object.entries(grouped).map(([emoji, group]) => (
                <ReactionPill
                  key={emoji}
                  emoji={emoji}
                  reactions={group}
                  currentUserId={currentUserId}
                  commentId={comment.id}
                  onToggle={handleReactionToggle}
                />
              ))}
              {/* Add more reactions */}
              <EmojiPicker
                commentId={comment.id}
                onToggle={handleReactionToggle}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
