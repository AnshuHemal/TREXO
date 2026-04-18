"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  BellOff, Bell, CheckCircle2, AlertCircle, Loader2,
  UserCheck, AtSign, ArrowRightLeft, MessageSquare,
  ExternalLink, Info, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setProjectMuted } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalPrefs {
  assigned: boolean;
  mentioned: boolean;
  statusChanged: boolean;
  commentAdded: boolean;
}

interface ProjectNotificationsFormProps {
  projectId: string;
  projectName: string;
  projectKey: string;
  workspaceSlug: string;
  isMuted: boolean;
  globalPrefs: GlobalPrefs;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  disabled,
  size = "md",
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const trackW = size === "sm" ? "w-9"  : "w-11";
  const trackH = size === "sm" ? "h-5"  : "h-6";
  const thumbS = size === "sm" ? "size-3" : "size-4";
  const travel = size === "sm" ? 16 : 20;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        trackW, trackH,
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <motion.span
        animate={{ x: enabled ? travel : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-lg mt-0.5",
          thumbS,
        )}
      />
    </button>
  );
}

// ─── Notification type row ────────────────────────────────────────────────────

const NOTIF_TYPES = [
  {
    key: "assigned" as keyof GlobalPrefs,
    label: "Issue assigned to me",
    description: "When someone assigns an issue to you in this project.",
    icon: UserCheck,
    iconColor: "text-primary",
  },
  {
    key: "mentioned" as keyof GlobalPrefs,
    label: "Mentioned in a comment",
    description: "When someone @mentions you in a comment on this project's issues.",
    icon: AtSign,
    iconColor: "text-purple-500",
  },
  {
    key: "statusChanged" as keyof GlobalPrefs,
    label: "Issue status changed",
    description: "When the status of an issue you reported in this project changes.",
    icon: ArrowRightLeft,
    iconColor: "text-yellow-500",
  },
  {
    key: "commentAdded" as keyof GlobalPrefs,
    label: "New comment on my issues",
    description: "When someone comments on an issue you reported or are assigned to.",
    icon: MessageSquare,
    iconColor: "text-primary",
  },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectNotificationsForm({
  projectId,
  projectName,
  projectKey,
  workspaceSlug,
  isMuted: initialMuted,
  globalPrefs,
}: ProjectNotificationsFormProps) {
  const [muted, setMuted] = useState(initialMuted);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggleMute(value: boolean) {
    setStatus("saving");
    setErrorMsg(null);
    startTransition(async () => {
      const result = await setProjectMuted(projectId, value);
      if (result.success) {
        setMuted(value);
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Failed to update settings.");
      }
    });
  }

  const anyGlobalDisabled = !Object.values(globalPrefs).every(Boolean);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Mute this project card ──────────────────────────────────────── */}
      <FadeInCard delay={0}>
        <div className={cn(
          "flex items-start justify-between gap-4 rounded-xl border p-5 transition-all duration-300",
          muted
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-card",
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              muted ? "bg-destructive/10" : "bg-primary/10",
            )}>
              {muted
                ? <BellOff className="size-5 text-destructive" />
                : <Bell className="size-5 text-primary" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {muted ? "Project notifications muted" : "Mute this project"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {muted
                  ? `You won't receive any notifications from ${projectName} until you unmute it.`
                  : `Stop all notifications from ${projectName}. You can unmute at any time.`
                }
              </p>
              {muted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-destructive"
                >
                  <ShieldAlert className="size-3.5" />
                  All notifications from this project are suppressed
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <Toggle
              enabled={muted}
              onChange={handleToggleMute}
              disabled={isPending}
            />
            {isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Status feedback */}
        <AnimatePresence mode="wait">
          {status === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-3.5" />
              {muted ? "Project muted — you won't receive notifications from this project." : "Project unmuted — notifications restored."}
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              <AlertCircle className="size-3.5" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </FadeInCard>

      {/* ── What's affected ─────────────────────────────────────────────── */}
      <FadeInCard delay={0.06}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">
              Notification types affected
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When muted, all of the following are suppressed for this project.
            </p>
          </div>
          <div className="divide-y divide-border">
            {NOTIF_TYPES.map(({ key, label, description, icon: Icon, iconColor }, i) => {
              const globalEnabled = globalPrefs[key];
              const effectivelyEnabled = !muted && globalEnabled;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: 0.08 + i * 0.04 }}
                  className={cn(
                    "flex items-center gap-4 px-5 py-3.5 transition-colors",
                    !effectivelyEnabled && "opacity-50",
                  )}
                >
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    effectivelyEnabled ? "bg-primary/10" : "bg-muted",
                  )}>
                    <Icon className={cn("size-4", effectivelyEnabled ? iconColor : "text-muted-foreground")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <div className="shrink-0">
                    {muted ? (
                      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                        <BellOff className="size-2.5" />
                        Muted
                      </span>
                    ) : !globalEnabled ? (
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Off globally
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <Bell className="size-2.5" />
                        Active
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </FadeInCard>

      {/* ── Global preferences notice ────────────────────────────────────── */}
      {anyGlobalDisabled && (
        <FadeInCard delay={0.12}>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Some notification types are disabled globally
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your workspace-level notification preferences override project settings.
                Even if this project is unmuted, globally disabled types won't fire.
              </p>
              <Link
                href="/settings/notifications"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Manage global preferences
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        </FadeInCard>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <FadeInCard delay={0.16}>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">How project muting works</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                Muting is per-user — other team members are not affected.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                Muting overrides all workspace-level notification preferences for this project.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                You can unmute at any time — past notifications are not restored.
              </li>
            </ul>
          </div>
        </div>
      </FadeInCard>

    </div>
  );
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────

function FadeInCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
