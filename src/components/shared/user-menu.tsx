"use client";

import Link from "next/link";
import { LogOut, Settings, LayoutDashboard, ChevronsUpDown } from "lucide-react";
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
import { signOut, useSession } from "@/lib/auth-client";

/**
 * Authenticated user menu shown in the header when a session exists.
 *
 * Navigation uses <Link> (asChild on DropdownMenuItem) instead of
 * router.push() to avoid the "Router action dispatched before initialization"
 * error that occurs when router methods are called during early hydration.
 *
 * Sign-out uses window.location.href for the same reason — it also ensures
 * a full page reload so all client state is cleared cleanly.
 */
export function UserMenu() {
  const { data: session, isPending } = useSession();

  // Still loading — render a skeleton the same size as the trigger button.
  if (isPending) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-muted" aria-hidden />
    );
  }

  // No session — header renders Login/Get Started instead.
  if (!session?.user) return null;

  const { user } = session;
  const initials = getInitials(user.name ?? user.email);

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          // Full page navigation clears all client state and avoids any
          // router-not-initialized race conditions.
          window.location.href = "/";
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-9 items-center gap-2 rounded-full pl-1 pr-2"
          aria-label="Open user menu"
        >
          <Avatar className="size-7">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name ?? "User avatar"}
            />
            <AvatarFallback className="text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
            {user.name ?? user.email}
          </span>
          <ChevronsUpDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" sideOffset={8}>
        {/* User info — not interactive */}
        <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
          <span className="truncate font-semibold text-foreground">
            {user.name ?? "User"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Use asChild + Link so navigation is handled by Next.js Link,
            not router.push, avoiding the hydration race. */}
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard className="mr-2 size-4" />
            Dashboard
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.slice(0, 2).toUpperCase();
}
