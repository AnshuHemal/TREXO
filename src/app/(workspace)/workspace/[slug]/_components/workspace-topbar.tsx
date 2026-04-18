"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Keyboard } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  settings:   "Settings",
  members:    "Members",
  "my-issues": "My Issues",
  projects:   "Projects",
  sprints:    "Sprints",
  backlog:    "Backlog",
};

function derivePageTitle(pathname: string, slug: string): string {
  const base = `/workspace/${slug}`;
  const rest = pathname.replace(base, "").replace(/^\//, "");
  if (!rest) return "Home";
  const firstSegment = rest.split("/")[0];
  return SEGMENT_LABELS[firstSegment] ?? firstSegment;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkspaceTopbarProps {
  workspaceName: string;
  workspaceSlug: string;
  workspaceId?: string;
  pageTitle?: string;
  projects?: { id: string; name: string; key: string }[];
  members?: { id: string; name: string; image: string | null }[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceTopbar({
  workspaceName,
  workspaceSlug,
  workspaceId,
  pageTitle,
  projects = [],
  members = [],
}: WorkspaceTopbarProps) {
  const pathname = usePathname();
  const title = pageTitle ?? derivePageTitle(pathname, workspaceSlug);
  const ctx = useWorkspaceSafe();

  // Prefer context values (always up-to-date) over props
  const resolvedWorkspaceId = workspaceId ?? ctx?.workspaceId;
  const resolvedProjects    = projects.length > 0 ? projects : (ctx?.projects ?? []);
  const resolvedMembers     = members.length  > 0 ? members  : (ctx?.members  ?? []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      {/* Left: breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link
          href={`/workspace/${workspaceSlug}`}
          className="font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {workspaceName}
        </Link>
        {title !== "Home" && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">{title}</span>
          </>
        )}
      </nav>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1.5">
        {/* Global search */}
        <GlobalSearch
          workspaceId={resolvedWorkspaceId}
          workspaceSlug={workspaceSlug}
          projects={resolvedProjects}
          members={resolvedMembers}
        />

        <div className="h-4 w-px bg-border" aria-hidden />

        {/* Keyboard shortcuts hint */}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
          onClick={() => {
            // Dispatch a synthetic ? keydown to trigger the project shortcuts provider
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }));
          }}
        >
          <Keyboard className="size-4" />
        </Button>

        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
