"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tag, Plus, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabelOption {
  id: string;
  name: string;
  color: string;
}

interface LabelPickerProps {
  issueId: string;
  allLabels: LabelOption[];
  selectedLabels: LabelOption[];
  onAdd: (labelId: string) => Promise<void>;
  onRemove: (labelId: string) => Promise<void>;
  disabled?: boolean;
}

// ─── Label badge ──────────────────────────────────────────────────────────────

export function LabelBadge({
  label,
  onRemove,
  size = "sm",
}: {
  label: LabelOption;
  onRemove?: () => void;
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
      style={{
        backgroundColor: `${label.color}20`,
        borderColor: `${label.color}60`,
        color: label.color,
      }}
    >
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity"
          aria-label={`Remove ${label.name}`}
        >
          <X className="size-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LabelPicker({
  issueId: _issueId,
  allLabels,
  selectedLabels,
  onAdd,
  onRemove,
  disabled = false,
}: LabelPickerProps) {
  const [open, setOpen]               = useState(false);
  const [isPending, startTransition]  = useTransition();
  const [pendingId, setPendingId]     = useState<string | null>(null);

  const selectedIds = new Set(selectedLabels.map((l) => l.id));

  function handleToggle(label: LabelOption) {
    if (disabled || isPending) return;
    setPendingId(label.id);
    startTransition(async () => {
      if (selectedIds.has(label.id)) {
        await onRemove(label.id);
      } else {
        await onAdd(label.id);
      }
      setPendingId(null);
    });
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      {/* Selected labels */}
      <div className="flex flex-wrap gap-1">
        {selectedLabels.map((label) => (
          <motion.span
            key={label.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <LabelBadge
              label={label}
              onRemove={disabled ? undefined : () => handleToggle(label)}
            />
          </motion.span>
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="size-3" />
            {selectedLabels.length === 0 ? "Add label" : ""}
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            >
              {allLabels.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-4 text-center">
                  <Tag className="size-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No labels yet.</p>
                  <p className="text-[11px] text-muted-foreground/60">
                    Create labels in workspace settings.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto p-1">
                  {allLabels.map((label) => {
                    const isSelected = selectedIds.has(label.id);
                    const isLoading  = pendingId === label.id;

                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => handleToggle(label)}
                        disabled={isPending}
                        className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                        <span className="flex-1 truncate text-foreground">{label.name}</span>
                        {isLoading
                          ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                          : isSelected
                            ? <Check className="size-3.5 text-primary" />
                            : null
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
