"use client";

import { motion, AnimatePresence } from "motion/react";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShortcutEntry {
  keys: string;
  description: string;
  group: string;
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutEntry[];
}

// ─── Kbd component ────────────────────────────────────────────────────────────

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn(
      "inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border",
      "bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground shadow-sm",
    )}>
      {children}
    </kbd>
  );
}

function KeySequence({ keys }: { keys: string }) {
  const parts = keys.split(" ");
  return (
    <div className="flex items-center gap-1">
      {parts.map((k, i) => (
        <span key={i} className="flex items-center gap-1">
          <Kbd>{k === "?" ? "?" : k.toUpperCase()}</Kbd>
          {i < parts.length - 1 && (
            <span className="text-[10px] text-muted-foreground">then</span>
          )}
        </span>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeyboardShortcutsModal({ open, onClose, shortcuts }: KeyboardShortcutsModalProps) {
  // Group shortcuts
  const groups = shortcuts.reduce<Record<string, ShortcutEntry[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="shortcuts-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="shortcuts-panel"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                  <Keyboard className="size-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h2>
                  <p className="text-xs text-muted-foreground">Speed up your workflow</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={onClose}
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto p-5">
              <div className="flex flex-col gap-6">
                {Object.entries(groups).map(([group, entries]) => (
                  <div key={group}>
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {entries.map((s) => (
                        <motion.div
                          key={s.keys}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15 }}
                          className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm text-foreground">{s.description}</span>
                          <KeySequence keys={s.keys} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-3">
              <p className="text-center text-xs text-muted-foreground">
                Shortcuts are disabled when typing in an input field
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
