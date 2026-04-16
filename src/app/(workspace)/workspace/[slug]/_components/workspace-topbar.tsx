"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT_LABELS: Record<string, string> = {
  settings: "Settings",
  members: "Members",
  "my-issues": "My Issues",
  projects: "Projects",
};

function derivePageTitle(pathname: string, slug: string): string {
  // Strip the base workspace path
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
  pageTitle?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceTopbar({
  workspaceName,
  workspaceSlug,
  pageTitle,
}: WorkspaceTopbarProps) {
  const pathname = usePathname();
  const title = pageTitle ?? derivePageTitle(pathname, workspaceSlug);

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

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          title="Notifications"
          className="text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
