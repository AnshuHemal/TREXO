"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tag, Plus, X, Check, Loader2, Search } from "lucide-react";
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
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      )}
      style={{
        backgroundColor: `${label.color}18`,
        borderColor: `${label.color}50`,
        color: label.color,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full opacity-50 transition-opacity hover:opacity-100"
          aria-label={`Remove ${label.name}`}
        >
          <X className="size-2.5" />
        </button>
      )}
    </motion.span>
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
  const [open, setOpen]              = useState(false);
  const [search, setSearch]          = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId]    = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedIds = new Set(selectedLabels.map((l) => l.id));

  const filtered = allLabels.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase().trim()),
  );

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

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
        <AnimatePresence mode="popLayout">
          {selectedLabels.map((label) => (
            <LabelBadge
              key={label.id}
              label={label}
              onRemove={disabled ? undefined : () => handleToggle(label)}
            />
          ))}
        </AnimatePresence>

        {!disabled && (
          <motion.button
            type="button"
            onClick={() => setOpen((v) => !v)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
              open
                ? "border-primary bg-primary/10 text-primary"
                : "border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            <Plus className="size-3" />
            {selectedLabels.length === 0 ? "Add label" : ""}
          </motion.button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.13, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute left-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
            >
              {/* Search */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search labels…"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {/* Label list */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 px-3 py-5 text-center">
                  <Tag className="size-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    {search ? `No labels match "${search}"` : "No labels yet."}
                  </p>
                  {!search && (
                    <p className="text-[11px] text-muted-foreground/60">
                      Create labels in workspace settings.
                    </p>
                  )}
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto p-1">
                  {filtered.map((label) => {
                    const isSelected = selectedIds.has(label.id);
                    const isLoading  = pendingId === label.id;

                    return (
                      <motion.button
                        key={label.id}
                        type="button"
                        onClick={() => handleToggle(label)}
                        disabled={isPending}
                        whileHover={{ backgroundColor: "var(--accent)" }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-50"
                      >
                        {/* Color dot */}
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="flex-1 truncate text-sm text-foreground">{label.name}</span>
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                        ) : isSelected ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex size-4 items-center justify-center rounded-full bg-primary"
                          >
                            <Check className="size-2.5 text-primary-foreground" />
                          </motion.span>
                        ) : null}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Footer hint */}
              <div className="border-t border-border px-3 py-2">
                <p className="text-[10px] text-muted-foreground/60">
                  Manage labels in{" "}
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); setOpen(false); }}
                    className="text-primary hover:underline"
                  >
                    workspace settings
                  </a>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
