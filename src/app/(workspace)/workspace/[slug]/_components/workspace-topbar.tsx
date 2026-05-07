"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Keyboard, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GlobalSearch } from "@/components/shared/global-search";
import { NotificationBell } from "@/components/shared/notification-bell";
import { Button } from "@/components/ui/button";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";
import { useMobileSidebarSafe } from "@/components/providers/mobile-sidebar-provider";

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
  const rest = pathname.replace(base, "").replace(/^\
  if (!rest) return "Home";
  const firstSegment = rest.split("/")[0];
  return SEGMENT_LABELS[firstSegment] ?? firstSegment;
}

interface WorkspaceTopbarProps {
  workspaceName: string;
  workspaceSlug: string;
  workspaceId?: string;
  pageTitle?: string;
  projects?: { id: string; name: string; key: string }[];
  members?: { id: string; name: string; image: string | null }[];
}

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
  const mobileSidebar = useMobileSidebarSafe();

  const resolvedWorkspaceId = workspaceId ?? ctx?.workspaceId;
  const resolvedProjects    = projects.length > 0 ? projects : (ctx?.projects ?? []);
  const resolvedMembers     = members.length  > 0 ? members  : (ctx?.members  ?? []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      {}
      <div className="flex items-center gap-2">
        {}
        {mobileSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Open menu"
            onClick={mobileSidebar.toggle}
          >
            <Menu className="size-5" />
          </Button>
        )}

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
      </div>

      {}
      <div className="flex items-center gap-1.5">
        {}
        <GlobalSearch
          workspaceId={resolvedWorkspaceId}
          workspaceSlug={workspaceSlug}
          projects={resolvedProjects}
          members={resolvedMembers}
        />

        <div className="h-4 w-px bg-border" aria-hidden />

        {}
        <Button
          variant="ghost"
          size="icon"
          className="hidden size-8 text-muted-foreground hover:text-foreground sm:flex"
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts (?)"
          onClick={() => {
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
