"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ISSUE_TYPES, ISSUE_STATUSES, ISSUE_PRIORITIES } from "@/lib/issue-config";
import { createIssue } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CreateIssueDialogProps {
  projectId: string;
  projectKey: string;
  workspaceSlug: string;
  members: Member[];
  defaultStatus?: string;
  trigger?: React.ReactNode;
  onCreated?: (issueId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateIssueDialog({
  projectId,
  projectKey,
  workspaceSlug: _workspaceSlug,
  members,
  defaultStatus = "BACKLOG",
  trigger,
  onCreated,
}: CreateIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("TASK");
  const [status, setStatus] = useState(defaultStatus);
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("none");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setType("TASK");
    setStatus(defaultStatus);
    setPriority("MEDIUM");
    setAssigneeId("none");
    setFieldErrors({});
    setServerError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const result = await createIssue({
        projectId,
        title,
        type: type as never,
        status: status as never,
        priority: priority as never,
        assigneeId: assigneeId === "none" ? null : assigneeId,
      });

      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }

      onCreated?.(result.data!.id);
      handleOpenChange(false);
      // Refresh the page to show the new issue
      window.location.reload();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            New issue
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DialogHeader>
            <DialogTitle>
              Create issue
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {projectKey}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue-title">Title</Label>
              <Input
                id="issue-title"
                placeholder="Issue title"
                autoFocus
                required
                disabled={isPending}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: "" })); }}
                className={cn(fieldErrors.title && "border-destructive")}
              />
              <AnimatePresence mode="wait">
                {fieldErrors.title && (
                  <motion.p key="te" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive">
                    {fieldErrors.title}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Type + Status + Priority row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isPending}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarImage src={m.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(m.name)}</AvatarFallback>
                        </Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Server error */}
            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div key="se" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="size-4 shrink-0" />{serverError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isPending}>
                {isPending ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Creating…</span> : "Create issue"}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
