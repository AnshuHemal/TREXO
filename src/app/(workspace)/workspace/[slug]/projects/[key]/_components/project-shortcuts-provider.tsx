"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/shared/keyboard-shortcuts-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectShortcutsProviderProps {
  children: React.ReactNode;
  workspaceSlug: string;
  projectKey: string;
  /** Called when C is pressed — parent should open the create issue dialog */
  onCreateIssue: () => void;
}

// ─── Shortcut definitions (shown in help modal) ───────────────────────────────
// Order matters — groups appear in this order in the modal.

const SHORTCUT_DEFS = [
  // General
  { keys: "?",   description: "Show keyboard shortcuts",  group: "General"    },
  { keys: "⌘k",  description: "Open search palette",      group: "General"    },

  // Navigation
  { keys: "g b", description: "Go to Board",              group: "Navigation" },
  { keys: "g l", description: "Go to Backlog",            group: "Navigation" },
  { keys: "g e", description: "Go to Epics",              group: "Navigation" },
  { keys: "g s", description: "Go to Sprints",            group: "Navigation" },
  { keys: "g r", description: "Go to Roadmap",            group: "Navigation" },

  // Issues
  { keys: "c",   description: "Create new issue",         group: "Issues"     },

  // Issue Detail (shown when an issue is open)
  { keys: "e",   description: "Edit issue title",         group: "Issue Detail" },
  { keys: "a",   description: "Assign to me",             group: "Issue Detail" },
  { keys: "s",   description: "Change status",            group: "Issue Detail" },
  { keys: "p",   description: "Change priority",          group: "Issue Detail" },
  { keys: "esc", description: "Close modal / dialog",     group: "Issue Detail" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectShortcutsProvider({
  children,
  workspaceSlug,
  projectKey,
  onCreateIssue,
}: ProjectShortcutsProviderProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  const base = `/workspace/${workspaceSlug}/projects/${projectKey}`;

  const navigate = useCallback(
    (path: string) => {
      if (pathname !== path) router.push(path);
    },
    [router, pathname],
  );

  useKeyboardShortcuts([
    {
      keys: "c",
      description: "Create new issue",
      group: "Issues",
      handler: onCreateIssue,
    },
    // Navigation — two-key sequences
    {
      keys: "g b",
      description: "Go to Board",
      group: "Navigation",
      handler: () => navigate(`${base}/board`),
    },
    {
      keys: "g l",
      description: "Go to Backlog",
      group: "Navigation",
      handler: () => navigate(`${base}/backlog`),
    },
    {
      keys: "g e",
      description: "Go to Epics",
      group: "Navigation",
      handler: () => navigate(`${base}/epics`),
    },
    {
      keys: "g s",
      description: "Go to Sprints",
      group: "Navigation",
      handler: () => navigate(`${base}/sprints`),
    },
    {
      keys: "g r",
      description: "Go to Roadmap",
      group: "Navigation",
      handler: () => navigate(`${base}/roadmap`),
    },
    // Help
    {
      keys: "?",
      description: "Show keyboard shortcuts",
      group: "General",
      handler: () => setHelpOpen((v) => !v),
    },
  ]);

  return (
    <>
      {children}
      <KeyboardShortcutsModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        shortcuts={SHORTCUT_DEFS}
      />
    </>
  );
}
