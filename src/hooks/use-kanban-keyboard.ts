"use client";

import { useEffect, useCallback, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseKanbanKeyboardOptions {
  /** Flat ordered list of issue IDs visible on the board */
  issueIds: string[];
  /** Called when Enter is pressed on a focused card */
  onOpen: (issueId: string) => void;
  /** Called when E is pressed on a focused card */
  onEdit?: (issueId: string) => void;
  /** Whether keyboard nav is enabled */
  enabled?: boolean;
}

interface UseKanbanKeyboardReturn {
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
}

/**
 * Adds keyboard navigation to the Kanban board.
 *
 * - Arrow keys: move focus between cards
 * - Enter: open the focused card's detail modal
 * - E: trigger inline title edit on the focused card
 * - Escape: clear focus
 */
export function useKanbanKeyboard({
  issueIds,
  onOpen,
  onEdit,
  enabled = true,
}: UseKanbanKeyboardOptions): UseKanbanKeyboardReturn {
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept when typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[data-radix-popper-content-wrapper]") // dropdown open
      ) {
        return;
      }

      if (issueIds.length === 0) return;

      const currentIndex = focusedId ? issueIds.indexOf(focusedId) : -1;

      switch (e.key) {
        case "ArrowDown":
        case "j": {
          e.preventDefault();
          const nextIndex = currentIndex < issueIds.length - 1 ? currentIndex + 1 : 0;
          setFocusedId(issueIds[nextIndex]);
          break;
        }
        case "ArrowUp":
        case "k": {
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : issueIds.length - 1;
          setFocusedId(issueIds[prevIndex]);
          break;
        }
        case "Enter": {
          if (focusedId) {
            e.preventDefault();
            onOpen(focusedId);
          }
          break;
        }
        case "e":
        case "E": {
          if (focusedId && onEdit) {
            e.preventDefault();
            onEdit(focusedId);
          }
          break;
        }
        case "Escape": {
          setFocusedId(null);
          break;
        }
      }
    },
    [enabled, issueIds, focusedId, onOpen, onEdit],
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Clear focus when issue list changes significantly
  useEffect(() => {
    if (focusedId && !issueIds.includes(focusedId)) {
      setFocusedId(null);
    }
  }, [issueIds, focusedId]);

  return { focusedId, setFocusedId };
}
