"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/shared/keyboard-shortcuts-modal";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";

// ─── Global shortcut definitions ─────────────────────────────────────────────

const GLOBAL_SHORTCUTS = [
  { keys: "?",   description: "Show keyboard shortcuts",  group: "General"    },
  { keys: "⌘k",  description: "Open search palette",      group: "General"    },
  { keys: "g h", description: "Go to workspace home",     group: "Navigation" },
  { keys: "g m", description: "Go to My Issues",          group: "Navigation" },
];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Provides workspace-level shortcuts: ?, G H, G M.
 * Rendered inside the workspace layout so it's always active.
 * Project-level shortcuts (C, G B, etc.) are added by ProjectShortcutsProvider.
 */
export function GlobalShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const router   = useRouter();
  const pathname = usePathname();
  const ctx      = useWorkspaceSafe();

  const navigate = useCallback(
    (path: string) => { if (pathname !== path) router.push(path); },
    [router, pathname],
  );

  useKeyboardShortcuts([
    {
      keys: "?",
      description: "Show keyboard shortcuts",
      group: "General",
      handler: () => setOpen((v) => !v),
    },
    {
      keys: "g h",
      description: "Go to workspace home",
      group: "Navigation",
      handler: () => {
        const slug = ctx?.workspaceSlug;
        if (slug) navigate(`/workspace/${slug}`);
      },
    },
    {
      keys: "g m",
      description: "Go to My Issues",
      group: "Navigation",
      handler: () => {
        const slug = ctx?.workspaceSlug;
        if (slug) navigate(`/workspace/${slug}/my-issues`);
      },
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
