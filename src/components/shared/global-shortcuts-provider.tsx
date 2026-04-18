"use client";

import { useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/shared/keyboard-shortcuts-modal";

// ─── Global shortcut definitions ─────────────────────────────────────────────
// These are workspace-level shortcuts available everywhere.
// Project-level shortcuts (C, G B, etc.) are added by ProjectShortcutsProvider.

const GLOBAL_SHORTCUTS = [
  { keys: "?",   description: "Show keyboard shortcuts",  group: "General"    },
  { keys: "⌘k",  description: "Open search palette",      group: "General"    },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Provides the global `?` shortcut to open the keyboard shortcuts modal.
 * Rendered inside the workspace layout so it's always active.
 */
export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      keys: "?",
      description: "Show keyboard shortcuts",
      group: "General",
      handler: () => setOpen((v) => !v),
    },
  ]);

  return (
    <>
      {children}
      <KeyboardShortcutsModal
        open={open}
        onClose={() => setOpen(false)}
        shortcuts={GLOBAL_SHORTCUTS}
      />
    </>
  );
}
