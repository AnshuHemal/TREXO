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

const SHORTCUT_DEFS = [
  { keys: "c",   description: "Create issue",       group: "Issues" },
  { keys: "b",   description: "Go to Backlog",       group: "Navigation" },
  { keys: "g b", description: "Go to Board",         group: "Navigation" },
  { keys: "g s", description: "Go to Sprints",       group: "Navigation" },
  { keys: "g r", description: "Go to Roadmap",       group: "Navigation" },
  { keys: "?",   description: "Show this help",      group: "General" },
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
      description: "Create issue",
      group: "Issues",
      handler: onCreateIssue,
    },
    {
      keys: "b",
      description: "Go to Backlog",
      group: "Navigation",
      handler: () => navigate(`${base}/backlog`),
    },
    {
      keys: "g b",
      description: "Go to Board",
      group: "Navigation",
      handler: () => navigate(base),
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
