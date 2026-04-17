"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, CheckCheck, GitBranch, MessageSquare,
  UserCheck, ArrowRightLeft, X, AtSign, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRealtime } from "@/hooks/use-realtime";
import { useWorkspaceSafe } from "@/components/providers/workspace-provider";
import type { RealtimeEvent } from "@/lib/sse";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: { id: string; name: string; image: string | null };
  issue: {
    id: string;
    key: number;
    title: string;
    project: { key: string; workspace: { slug: string } };
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getNotificationText(type: string, actorName: string): string {
  switch (type) {
    case "assigned":       return `${actorName} assigned you to an issue`;
    case "status_changed": return `${actorName} changed the status of your issue`;
    case "comment_added":  return `${actorName} commented on an issue`;
    case "mentioned":      return `${actorName} mentioned you in a comment`;
    default:               return `${actorName} updated an issue`;
  }
}

function NotificationIcon({ type }: { type: string }) {
  const cls = "size-3.5";
  switch (type) {
    case "assigned":       return <UserCheck className={cn(cls, "text-primary")} />;
    case "status_changed": return <ArrowRightLeft className={cn(cls, "text-yellow-500")} />;
    case "comment_added":  return <MessageSquare className={cn(cls, "text-primary")} />;
    case "mentioned":      return <AtSign className={cn(cls, "text-purple-500")} />;
    default:               return <GitBranch className={cn(cls, "text-muted-foreground")} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(false);
  const dropdownRef                       = useRef<HTMLDivElement>(null);
  const ctx                               = useWorkspaceSafe();

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently fail
    }
  }, []);

  // Initial fetch only — SSE replaces polling
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── SSE — replace 30s polling with instant push ───────────────────────────────
  useRealtime({
    workspaceId: ctx?.workspaceId,
    filter: ["notification.created"],
    onEvent: useCallback((event: RealtimeEvent) => {
      // Re-fetch to get the full notification with actor/issue details
      fetchNotifications();
    }, [fetchNotifications]),
    enabled: !!ctx?.workspaceId,
  });

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ── Mark as read ──────────────────────────────────────────────────────────────

  async function markRead(ids?: string[]) {
    setIsLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      });
      setNotifications((prev) =>
        prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => (ids ? Math.max(0, prev - ids.length) : 0));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClickNotification(notification: NotificationItem) {
    if (!notification.read) {
      await markRead([notification.id]);
    }
    setOpen(false);
    if (notification.issue) {
      const { project } = notification.issue;
      window.location.href = `/workspace/${project.workspace.slug}/projects/${project.key}/backlog`;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative size-8 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="absolute -right-0.5 -top-0.5 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground"
              style={{ height: 16 }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => markRead()}
                    disabled={isLoading}
                  >
                    <CheckCheck className="size-3.5" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground"
                  onClick={() => setOpen(false)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Bell className="size-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n, i) => (
                    <motion.button
                      key={n.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      onClick={() => handleClickNotification(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50",
                        !n.read && "bg-primary/5",
                      )}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 shrink-0">
                        {!n.read ? (
                          <span className="flex size-2 rounded-full bg-primary" />
                        ) : (
                          <span className="flex size-2" />
                        )}
                      </div>

                      {/* Actor avatar */}
                      <Avatar className="mt-0.5 size-7 shrink-0">
                        <AvatarImage src={n.actor.image ?? undefined} />
                        <AvatarFallback className="text-[10px]">{getInitials(n.actor.name)}</AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <NotificationIcon type={n.type} />
                          <p className="truncate text-xs text-foreground">
                            {getNotificationText(n.type, n.actor.name)}
                          </p>
                        </div>
                        {n.issue && (
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono">{n.issue.project.key}-{n.issue.key}</span>
                            {" · "}
                            {n.issue.title}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              {notifications.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
                </p>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => { setOpen(false); window.location.href = "/settings/notifications"; }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Settings2 className="size-3.5" />
                Manage preferences
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
