"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Home,
  CircleUser,
  Settings,
  LogOut,
  Plus,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { WorkspaceRole } from "@/generated/prisma/enums";
import { CreateProjectDialog } from "../projects/_components/create-project-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceSidebarProps {
  workspace: { id: string; name: string; slug: string; logo: string | null };
  projects: { id: string; name: string; key: string; icon: string | null }[];
  userWorkspaces: { id: string; name: string; slug: string }[];
  currentUserRole: WorkspaceRole;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkspaceSidebar({
  workspace,
  projects,
  userWorkspaces,
  currentUserRole,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const canCreateProject = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const baseSlug = `/workspace/${workspace.slug}`;

  const navItems = [
    { href: baseSlug, label: "Home", icon: Home, exact: true },
    { href: `${baseSlug}/my-issues`, label: "My Issues", icon: CircleUser, exact: false },
  ];

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar"
    >
      {/* ── Workspace switcher ─────────────────────────────────────────── */}
      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-9 w-full items-center justify-between gap-2 rounded-md px-2 text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-sm font-semibold text-sidebar-foreground">
                  {workspace.name}
                </span>
              </div>
              <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56" sideOffset={4}>
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Workspaces
            </DropdownMenuLabel>
            {userWorkspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} asChild>
                <Link
                  href={`/workspace/${ws.slug}`}
                  className="flex items-center gap-2"
                >
                  <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{ws.name}</span>
                  {ws.slug === workspace.slug && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/onboarding"
                className="flex items-center gap-2 text-muted-foreground"
              >
                <Plus className="size-4" />
                Create workspace
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Main nav ───────────────────────────────────────────────────── */}
      <nav className="px-2 py-2">
        {navItems.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              isActive(href, exact)
                ? "bg-accent text-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <Separator className="mx-3 my-1 w-auto" />

      {/* ── Projects ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-2">
        {/* Section header */}
        <div className="flex items-center justify-between px-2.5 py-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects
          </span>
          {canCreateProject ? (
            <CreateProjectDialog
              workspaceId={workspace.id}
              workspaceSlug={workspace.slug}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 text-muted-foreground hover:text-foreground"
                  aria-label="Create project"
                  title="Create project"
                >
                  <Plus className="size-3.5" />
                </Button>
              }
            />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-5 text-muted-foreground hover:text-foreground"
              aria-label="Create project"
              title="Create project"
              disabled
            >
              <Plus className="size-3.5" />
            </Button>
          )}
        </div>

        {/* Project list */}
        {projects.length === 0 ? (
          <p className="px-2.5 py-1.5 text-xs text-muted-foreground">
            No projects yet
          </p>
        ) : (
          projects.map((project) => {
            const href = `${baseSlug}/projects/${project.key}`;
            return (
              <Link
                key={project.id}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <div className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                  {project.key.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{project.name}</span>
              </Link>
            );
          })
        )}
      </div>

      <Separator className="mx-3 w-auto" />

      {/* ── Bottom section ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 px-2 py-3">
        {/* Settings link */}
        <Link
          href={`${baseSlug}/settings`}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
            isActive(`${baseSlug}/settings`)
              ? "bg-accent text-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <Settings className="size-4 shrink-0" />
          Settings
        </Link>

        {/* User info + sign out */}
        {user && (
          <div className="mt-1 flex items-center gap-2 rounded-md px-2.5 py-1.5">
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(user.name ?? user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold text-sidebar-foreground">
                {user.name ?? "User"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {user.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
