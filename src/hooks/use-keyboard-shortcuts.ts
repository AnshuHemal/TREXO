"use client";

import { useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShortcutHandler {
  /** Key sequence, e.g. "c", "b", "g b", "?" */
  keys: string;
  /** Human-readable description shown in the help modal */
  description: string;
  /** Group label for the help modal */
  group: string;
  /** Called when the shortcut fires */
  handler: () => void;
  /** If true, fires even when an input/textarea is focused */
  allowInInput?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Registers keyboard shortcuts.
 * Supports single keys ("c") and two-key sequences ("g b") with a 1s timeout.
 * Automatically ignores shortcuts when focus is inside an input/textarea/select
 * unless `allowInInput` is set.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  const pendingKey = useRef<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function isInputFocused() {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (el as HTMLElement).isContentEditable
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Ignore modifier combos (Ctrl/Cmd/Alt)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const inputFocused = isInputFocused();

      // Build the candidate sequence
      const sequence = pendingKey.current ? `${pendingKey.current} ${key}` : key;

      // Clear pending timer
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }

      // Check for a matching shortcut
      for (const shortcut of shortcuts) {
        if (shortcut.keys === sequence) {
          if (inputFocused && !shortcut.allowInInput) {
            pendingKey.current = null;
            return;
          }
          e.preventDefault();
          pendingKey.current = null;
          shortcut.handler();
          return;
        }
      }

      // Check if this key could be the start of a two-key sequence
      const couldBePrefix = shortcuts.some((s) => s.keys.startsWith(key + " "));
      if (couldBePrefix && !inputFocused) {
        pendingKey.current = key;
        // Reset after 1s if no follow-up key
        pendingTimer.current = setTimeout(() => {
          pendingKey.current = null;
        }, 1000);
        return;
      }

      pendingKey.current = null;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
    };
  }, [shortcuts]);
}
