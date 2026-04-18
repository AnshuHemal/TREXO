"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
  GripVertical, Pencil, Check, X, RotateCcw, Save,
  Loader2, Info, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  type WorkflowConfig, type WorkflowStatus, type WorkflowTransition,
  DEFAULT_WORKFLOW_CONFIG,
} from "@/lib/workflow";
import { saveWorkflowConfig, resetWorkflowConfig } from "../actions";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowEditorProps {
  projectId: string;
  projectKey: string;
  workspaceSlug: string;
  initialConfig: WorkflowConfig;
}

// ─── Status color map ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     "bg-muted/60 text-muted-foreground border-border",
  TODO:        "bg-muted/60 text-foreground border-border",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/30",
  IN_REVIEW:   "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  DONE:        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  CANCELLED:   "bg-muted/60 text-muted-foreground border-border",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  BACKLOG:     "bg-muted-foreground",
  TODO:        "bg-foreground",
  IN_PROGRESS: "bg-primary",
  IN_REVIEW:   "bg-yellow-500",
  DONE:        "bg-emerald-500",
  CANCELLED:   "bg-muted-foreground",
};

// ─── Status row ───────────────────────────────────────────────────────────────

function StatusRow({
  status,
  isLocked,
  onLabelChange,
  onToggleEnabled,
}: {
  status: WorkflowStatus;
  isLocked: boolean;
  onLabelChange: (value: string, label: string) => void;
  onToggleEnabled: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft]         = useState(status.label);

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) { setDraft(status.label); setIsEditing(false); return; }
    onLabelChange(status.value, trimmed);
    setIsEditing(false);
  }

  return (
    <Reorder.Item
      value={status}
      id={status.value}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors",
        !status.enabled && "opacity-50",
      )}
      whileDrag={{ scale: 1.02, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
    >
      {/* Drag handle */}
      <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
        <GripVertical className="size-4" />
      </div>

      {/* Status dot */}
      <div className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOT_COLORS[status.value] ?? "bg-muted-foreground")} />

      {/* Label */}
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {isEditing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setDraft(status.label); setIsEditing(false); }
              }}
              autoFocus
              maxLength={32}
              className="h-7 flex-1 text-sm"
            />
            <Button size="icon" className="size-7" onClick={handleSave}>
              <Check className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7"
              onClick={() => { setDraft(status.label); setIsEditing(false); }}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="truncate text-sm font-medium text-foreground">
              {status.label}
            </span>
            <span className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
              STATUS_COLORS[status.value] ?? "bg-muted text-muted-foreground border-border",
            )}>
              {status.value.replace(/_/g, " ")}
            </span>
            {!isLocked && (
              <button
                type="button"
                onClick={() => { setDraft(status.label); setIsEditing(true); }}
                className="shrink-0 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
                aria-label="Edit label"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Locked badge */}
      {isLocked && (
        <span className="shrink-0 text-[10px] text-muted-foreground/60">Required</span>
      )}

      {/* Enable/disable toggle */}
      {!isLocked && (
        <Switch
          checked={status.enabled}
          onCheckedChange={() => onToggleEnabled(status.value)}
          size="sm"
          aria-label={status.enabled ? "Disable status" : "Enable status"}
        />
      )}
    </Reorder.Item>
  );
}

// ─── Transition matrix ────────────────────────────────────────────────────────

function TransitionMatrix({
  statuses,
  transitions,
  onToggle,
  onSetAllAllowed,
}: {
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[] | null;
  onToggle: (from: string, to: string) => void;
  onSetAllAllowed: (allAllowed: boolean) => void;
}) {
  const enabled = statuses.filter((s) => s.enabled);
  const allAllowed = transitions === null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle all-allowed */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Allow all transitions</p>
          <p className="text-xs text-muted-foreground">
            When enabled, issues can move between any statuses freely.
          </p>
        </div>
        <Switch
          checked={allAllowed}
          onCheckedChange={(v) => onSetAllAllowed(v)}
        />
      </div>

      {/* Matrix */}
      <AnimatePresence>
        {!allAllowed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border bg-muted/30 px-4 py-2.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Click a cell to allow/deny that transition. Rows = From, Columns = To.
                </p>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="w-28 pb-2 text-left text-[11px] font-semibold text-muted-foreground">
                        From ↓ / To →
                      </th>
                      {enabled.map((s) => (
                        <th key={s.value} className="pb-2 text-center">
                          <span className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            STATUS_COLORS[s.value] ?? "bg-muted text-muted-foreground border-border",
                          )}>
                            {s.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enabled.map((from) => (
                      <tr key={from.value} className="border-t border-border/50">
                        <td className="py-2 pr-3">
                          <span className={cn(
                            "inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            STATUS_COLORS[from.value] ?? "bg-muted text-muted-foreground border-border",
                          )}>
                            {from.label}
                          </span>
                        </td>
                        {enabled.map((to) => {
                          const isSelf = from.value === to.value;
                          const isAllowed = !isSelf && (
                            transitions?.some((t) => t.from === from.value && t.to === to.value) ?? false
                          );

                          return (
                            <td key={to.value} className="py-2 text-center">
                              {isSelf ? (
                                <span className="text-muted-foreground/30">—</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onToggle(from.value, to.value)}
                                  className={cn(
                                    "mx-auto flex size-6 items-center justify-center rounded-md border transition-all",
                                    isAllowed
                                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                                      : "border-border bg-muted/30 text-muted-foreground/30 hover:border-border hover:bg-muted/60",
                                  )}
                                  aria-label={`${isAllowed ? "Deny" : "Allow"} ${from.label} → ${to.label}`}
                                >
                                  {isAllowed
                                    ? <Check className="size-3" />
                                    : <X className="size-3" />
                                  }
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkflowEditor({
  projectId,
  projectKey: _projectKey,
  workspaceSlug: _workspaceSlug,
  initialConfig,
}: WorkflowEditorProps) {
  const [statuses, setStatuses]     = useState<WorkflowStatus[]>(initialConfig.statuses);
  const [transitions, setTransitions] = useState<WorkflowTransition[] | null>(initialConfig.transitions);
  const [isSaving, startSave]       = useTransition();
  const [isResetting, startReset]   = useTransition();
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Locked statuses — DONE and CANCELLED can't be disabled (needed for completion logic)
  const LOCKED = new Set(["DONE", "CANCELLED"]);

  function handleLabelChange(value: string, label: string) {
    setStatuses((prev) => prev.map((s) => s.value === value ? { ...s, label } : s));
    setSaveSuccess(false);
  }

  function handleToggleEnabled(value: string) {
    setStatuses((prev) => prev.map((s) => s.value === value ? { ...s, enabled: !s.enabled } : s));
    setSaveSuccess(false);
  }

  function handleReorder(newOrder: WorkflowStatus[]) {
    setStatuses(newOrder.map((s, i) => ({ ...s, order: i })));
    setSaveSuccess(false);
  }

  function handleToggleTransition(from: string, to: string) {
    setTransitions((prev) => {
      const current = prev ?? [];
      const exists = current.some((t) => t.from === from && t.to === to);
      if (exists) return current.filter((t) => !(t.from === from && t.to === to));
      return [...current, { from, to }];
    });
    setSaveSuccess(false);
  }

  function handleSetAllAllowed(allAllowed: boolean) {
    if (allAllowed) {
      setTransitions(null);
    } else {
      // Start with all transitions allowed
      const enabled = statuses.filter((s) => s.enabled);
      const all: WorkflowTransition[] = [];
      for (const from of enabled) {
        for (const to of enabled) {
          if (from.value !== to.value) all.push({ from: from.value, to: to.value });
        }
      }
      setTransitions(all);
    }
    setSaveSuccess(false);
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startSave(async () => {
      const result = await saveWorkflowConfig(projectId, { statuses, transitions });
      if (!result.success) {
        setSaveError(result.error ?? "Failed to save.");
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }

  function handleReset() {
    startReset(async () => {
      const result = await resetWorkflowConfig(projectId);
      if (result.success) {
        setStatuses(DEFAULT_WORKFLOW_CONFIG.statuses);
        setTransitions(DEFAULT_WORKFLOW_CONFIG.transitions);
        setSaveSuccess(false);
        setSaveError(null);
      }
    });
  }

  const enabledCount = statuses.filter((s) => s.enabled).length;
  const hasChanges = JSON.stringify({ statuses, transitions }) !==
    JSON.stringify({ statuses: initialConfig.statuses, transitions: initialConfig.transitions });

  return (
    <div className="flex max-w-3xl flex-col gap-6">

      {/* ── Status columns ──────────────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Status columns</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Rename labels and drag to reorder board columns. Disabled statuses are hidden from the board.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Eye className="size-3.5" />
              {enabledCount} visible
            </div>
          </div>

          <Reorder.Group
            axis="y"
            values={statuses}
            onReorder={handleReorder}
            className="flex flex-col gap-2"
          >
            <AnimatePresence initial={false}>
              {statuses.map((status) => (
                <StatusRow
                  key={status.value}
                  status={status}
                  isLocked={LOCKED.has(status.value)}
                  onLabelChange={handleLabelChange}
                  onToggleEnabled={handleToggleEnabled}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
            <Info className="size-3.5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              The underlying status values (BACKLOG, TODO, etc.) never change — only display labels and order are customized.
              Issues keep their status when you rename a column.
            </p>
          </div>
        </div>
      </FadeIn>

      {/* ── Transitions ─────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-foreground">Allowed transitions</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Control which status changes are permitted. Useful for enforcing review gates.
            </p>
          </div>

          <TransitionMatrix
            statuses={statuses}
            transitions={transitions}
            onToggle={handleToggleTransition}
            onSetAllAllowed={handleSetAllAllowed}
          />
        </div>
      </FadeIn>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <div className="flex items-center justify-between gap-4">
          {/* Reset to defaults */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={isResetting}>
                {isResetting
                  ? <Loader2 className="size-4 animate-spin" />
                  : <RotateCcw className="size-4" />
                }
                Reset to defaults
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset workflow</AlertDialogTitle>
                <AlertDialogDescription>
                  This will restore all status labels, column order, and transitions to the global defaults.
                  Your issues will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button onClick={handleReset} disabled={isResetting} className="gap-1.5">
                  {isResetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                  Reset
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex items-center gap-3">
            {/* Error */}
            <AnimatePresence>
              {saveError && (
                <motion.p
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-destructive"
                >
                  {saveError}
                </motion.p>
              )}
              {saveSuccess && (
                <motion.p
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                >
                  <Check className="size-3.5" />
                  Saved
                </motion.p>
              )}
            </AnimatePresence>

            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="gap-1.5"
            >
              {isSaving
                ? <Loader2 className="size-4 animate-spin" />
                : <Save className="size-4" />
              }
              Save workflow
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
