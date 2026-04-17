"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { createLabel, updateLabel, deleteLabel } from "../actions";

// ─── Preset colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#0f172a",
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface LabelItem {
  id: string;
  name: string;
  color: string;
  _count: { issues: number };
}

interface LabelsManagerProps {
  labels: LabelItem[];
  workspaceId: string;
  canManage: boolean;
}

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "size-6 rounded-full border-2 transition-transform hover:scale-110",
              value === c ? "border-foreground scale-110" : "border-transparent",
            )}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="size-6 rounded-full border border-border" style={{ backgroundColor: value }} />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#6366f1"
          className="h-7 w-28 font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── Label row ────────────────────────────────────────────────────────────────

function LabelRow({
  label,
  canManage,
  index,
  onUpdated,
  onDeleted,
}: {
  label: LabelItem;
  canManage: boolean;
  index: number;
  onUpdated: (id: string, name: string, color: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [isEditing, setIsEditing]   = useState(false);
  const [name, setName]             = useState(label.name);
  const [color, setColor]           = useState(label.color);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateLabel(label.id, { name, color });
      if (!result.success) {
        setError(result.fieldErrors?.name ?? result.fieldErrors?.color ?? result.error ?? "Failed to save.");
        return;
      }
      onUpdated(label.id, name, color);
      setIsEditing(false);
    });
  }

  function handleCancel() {
    setName(label.name);
    setColor(label.color);
    setError(null);
    setIsEditing(false);
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLabel(label.id);
      if (!result.success) { setError(result.error ?? "Failed to delete."); return; }
      onDeleted(label.id);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className="rounded-lg border border-border bg-card"
    >
      {isEditing ? (
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <div className="size-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              className="h-8 flex-1 text-sm"
              autoFocus
              disabled={isPending}
            />
          </div>
          <ColorPicker value={color} onChange={setColor} />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Check className="size-3" />Save</>}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={handleCancel} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
          <span className="flex-1 text-sm font-medium text-foreground">{label.name}</span>
          <span className="text-xs text-muted-foreground">
            {label._count.issues} {label._count.issues === 1 ? "issue" : "issues"}
          </span>
          {canManage && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditing(true)}>
                <Pencil className="size-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete label</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove <strong>{label.name}</strong> from all issues. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete label"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LabelsManager({ labels: initialLabels, workspaceId, canManage }: LabelsManagerProps) {
  const [labels, setLabels]         = useState(initialLabels);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName]       = useState("");
  const [newColor, setNewColor]     = useState("#6366f1");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleCreate() {
    setCreateError(null);
    startTransition(async () => {
      const result = await createLabel(workspaceId, { name: newName, color: newColor });
      if (!result.success) {
        setCreateError(result.fieldErrors?.name ?? result.fieldErrors?.color ?? result.error ?? "Failed to create.");
        return;
      }
      setLabels((prev) => [
        ...prev,
        { id: result.data!.id, name: newName.trim(), color: newColor, _count: { issues: 0 } },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor("#6366f1");
      setIsCreating(false);
    });
  }

  function handleUpdated(id: string, name: string, color: string) {
    setLabels((prev) => prev.map((l) => l.id === id ? { ...l, name, color } : l));
  }

  function handleDeleted(id: string) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {labels.length} {labels.length === 1 ? "label" : "labels"}
        </span>
        {canManage && !isCreating && (
          <Button size="sm" onClick={() => setIsCreating(true)} className="gap-1.5">
            <Plus className="size-4" />New label
          </Button>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">New label</h3>
              <div className="flex items-center gap-3">
                <div className="size-4 shrink-0 rounded-full" style={{ backgroundColor: newColor }} />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Label name"
                  className="h-8 flex-1 text-sm"
                  autoFocus
                  disabled={isPending}
                  onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) handleCreate(); if (e.key === "Escape") setIsCreating(false); }}
                />
              </div>
              <ColorPicker value={newColor} onChange={setNewColor} />
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <div className="flex items-center gap-2">
                <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={handleCreate} disabled={isPending || !newName.trim()}>
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <><Plus className="size-3" />Create label</>}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs" onClick={() => { setIsCreating(false); setNewName(""); setNewColor("#6366f1"); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label list */}
      {labels.length === 0 && !isCreating ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Tag className="size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">No labels yet.</p>
          {canManage && (
            <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => setIsCreating(true)}>
              <Plus className="size-4" />Create your first label
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {labels.map((label, i) => (
              <LabelRow
                key={label.id}
                label={label}
                canManage={canManage}
                index={i}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
