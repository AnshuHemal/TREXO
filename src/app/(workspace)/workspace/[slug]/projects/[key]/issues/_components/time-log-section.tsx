"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock, Plus, Pencil, Trash2, ChevronDown,
  Loader2, Check, AlertCircle, Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  logTime, updateTimeLog, deleteTimeLog, getTimeLogsForIssue,
  type TimeLogItem,
} from "../time-actions";
import { formatMinutes, parseTimeInput } from "@/lib/time-utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TimeLogSectionProps {
  issueId: string;
  estimate: number | null;
  currentUserId: string;
  initialLogs?: TimeLogItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

// ─── Log entry row ────────────────────────────────────────────────────────────

function LogEntryRow({
  log,
  isOwn,
  onUpdate,
  onDelete,
}: {
  log: TimeLogItem;
  isOwn: boolean;
  onUpdate: (id: string, minutes: number, description: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState(formatMinutes(log.minutes));
  const [desc, setDesc] = useState(log.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const minutes = parseTimeInput(timeInput);
    if (!minutes || minutes <= 0) {
      setError("Enter a valid duration (e.g. 1h 30m, 45m, 90)");
      return;
    }
    startTransition(async () => {
      const result = await updateTimeLog(log.id, { minutes, description: desc || null });
      if (!result.success) { setError(result.error ?? "Failed to update."); return; }
      onUpdate(log.id, minutes, desc || null);
      setIsEditing(false);
      setError(null);
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4 }}
      transition={{ duration: 0.18 }}
      className="group flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <Avatar className="mt-0.5 size-6 shrink-0">
        <AvatarFallback className="text-[9px] font-semibold">{getInitials(log.user.name)}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                value={timeInput}
                onChange={(e) => { setTimeInput(e.target.value); setError(null); }}
                placeholder="e.g. 1h 30m"
                className="h-7 w-28 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setIsEditing(false); }}
              />
              <Input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="What did you work on? (optional)"
                className="h-7 flex-1 text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-6 px-2 text-sm" onClick={handleSave} disabled={isPending}>
                {isPending ? <Loader2 className="size-3 animate-spin" /> : <><Check className="mr-1 size-3" />Save</>}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{formatMinutes(log.minutes)}</span>
              <span className="text-sm text-muted-foreground">by {log.user.name}</span>
              <span className="text-sm text-muted-foreground/60">{formatDate(log.loggedAt)}</span>
            </div>
            {log.description && (
              <p className="text-sm text-muted-foreground">{log.description}</p>
            )}
          </>
        )}
      </div>

      {isOwn && !isEditing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-3" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete time log</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove this {formatMinutes(log.minutes)} time entry? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button variant="destructive" onClick={() => onDelete(log.id)}>Delete</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </motion.div>
  );
}

// ─── Log time form ────────────────────────────────────────────────────────────

function LogTimeForm({
  issueId,
  onLogged,
  onCancel,
}: {
  issueId: string;
  onLogged: (log: TimeLogItem) => void;
  onCancel: () => void;
}) {
  const [timeInput, setTimeInput] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = parseTimeInput(timeInput);
    if (!minutes || minutes <= 0) {
      setError("Enter a valid duration (e.g. 1h 30m, 45m, 90)");
      return;
    }
    startTransition(async () => {
      const result = await logTime({ issueId, minutes, description: desc || null });
      if (!result.success) {
        setError(result.fieldErrors?.minutes ?? result.error ?? "Failed to log time.");
        return;
      }
      onLogged(result.data!);
    });
  }

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-lg border border-primary/30 bg-card p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Time spent
          </label>
          <Input
            value={timeInput}
            onChange={(e) => { setTimeInput(e.target.value); setError(null); }}
            placeholder="e.g. 1h 30m, 45m, 2h"
            className="h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-1">
        <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Description <span className="normal-case font-normal">(optional)</span>
        </label>
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="What did you work on?"
          className="h-8 text-sm"
        />
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-2 flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="size-3.5" />{error}
        </motion.p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="h-7 gap-1.5 px-3 text-sm" disabled={!timeInput.trim() || isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Timer className="size-3.5" />Log time</>}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-sm" onClick={onCancel}>
          Cancel
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          1h 30m · 45m · 90 · 2h
        </span>
      </div>
    </motion.form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TimeLogSection({
  issueId,
  estimate,
  currentUserId,
  initialLogs = [],
}: TimeLogSectionProps) {
  const [logs, setLogs] = useState<TimeLogItem[]>(initialLogs);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  // Start loading only when there are no pre-loaded logs
  const [isLoading, setIsLoading] = useState(() => initialLogs.length === 0);
  const [, startTransition] = useTransition();

  // Fetch logs on mount only if none were pre-loaded
  useEffect(() => {
    if (initialLogs.length > 0) return;
    let cancelled = false;
    getTimeLogsForIssue(issueId).then((result) => {
      if (cancelled) return;
      if (result.success) setLogs(result.data ?? []);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [issueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalLogged = logs.reduce((s, l) => s + l.minutes, 0);
  const estimateMinutes = estimate ? estimate * 60 : null; // story points → hours → minutes (rough)
  const pct = estimateMinutes && estimateMinutes > 0
    ? Math.min((totalLogged / estimateMinutes) * 100, 100)
    : 0;
  const isOver = estimateMinutes !== null && totalLogged > estimateMinutes;

  function handleLogged(log: TimeLogItem) {
    setLogs((prev) => [log, ...prev]);
    setIsAdding(false);
  }

  function handleUpdate(id: string, minutes: number, description: string | null) {
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, minutes, description } : l));
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTimeLog(id);
      if (result.success) setLogs((prev) => prev.filter((l) => l.id !== id));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
          <Clock className="size-4" />
          Time tracking
          {totalLogged > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {formatMinutes(totalLogged)}
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => { setIsAdding((v) => !v); setIsExpanded(true); }}
          aria-label="Log time"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2">
              {/* Progress bar (when estimate exists) */}
              {estimateMinutes !== null && estimateMinutes > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {formatMinutes(totalLogged)} logged
                    </span>
                    <span className={cn(
                      "font-medium",
                      isOver ? "text-destructive" : "text-muted-foreground",
                    )}>
                      {formatMinutes(estimateMinutes)} estimated
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <motion.div
                      className={cn("h-full rounded-full", isOver ? "bg-destructive" : "bg-primary")}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Log time form */}
              <AnimatePresence>
                {isAdding && (
                  <LogTimeForm
                    key="form"
                    issueId={issueId}
                    onLogged={handleLogged}
                    onCancel={() => setIsAdding(false)}
                  />
                )}
              </AnimatePresence>

              {/* Log entries */}
              {isLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />Loading…
                </div>
              ) : logs.length === 0 && !isAdding ? (
                <p className="text-sm text-muted-foreground">No time logged yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {logs.map((log) => (
                      <LogEntryRow
                        key={log.id}
                        log={log}
                        isOwn={log.user.id === currentUserId}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
