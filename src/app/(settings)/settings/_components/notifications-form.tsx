"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck, AtSign, ArrowRightLeft, MessageSquare,
  CheckCircle2, Loader2, Bell, BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveNotificationPrefs, type NotificationPrefs } from "../notifications/actions";

// ─── Preference definitions ───────────────────────────────────────────────────

interface PrefDef {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
}

const PREF_DEFS: PrefDef[] = [
  {
    key: "assigned",
    label: "Issue assigned to me",
    description: "When someone assigns an issue to you.",
    icon: UserCheck,
    iconColor: "text-primary",
  },
  {
    key: "mentioned",
    label: "Mentioned in a comment",
    description: "When someone @mentions you in a comment.",
    icon: AtSign,
    iconColor: "text-purple-500",
  },
  {
    key: "statusChanged",
    label: "Issue status changed",
    description: "When the status of an issue you reported changes.",
    icon: ArrowRightLeft,
    iconColor: "text-yellow-500",
  },
  {
    key: "commentAdded",
    label: "New comment on my issues",
    description: "When someone comments on an issue you reported or are assigned to.",
    icon: MessageSquare,
    iconColor: "text-primary",
  },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2",
        enabled ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <motion.span
        animate={{ x: enabled ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg"
      />
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationsFormProps {
  initialPrefs: NotificationPrefs;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsForm({ initialPrefs }: NotificationsFormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [savedState, setSavedState] = useState<"idle" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  const allEnabled  = Object.values(prefs).every(Boolean);
  const noneEnabled = Object.values(prefs).every((v) => !v);

  function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSavedState("idle");
  }

  function handleToggleAll(enable: boolean) {
    setPrefs({
      assigned:      enable,
      mentioned:     enable,
      statusChanged: enable,
      commentAdded:  enable,
    });
    setSavedState("idle");
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveNotificationPrefs(prefs);
      setSavedState(result.success ? "saved" : "error");
      if (result.success) {
        setTimeout(() => setSavedState("idle"), 3000);
      }
    });
  }

  const isDirty = JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  return (
    <div className="flex flex-col gap-6">
      {/* In-app only notice */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5"
      >
        <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">In-app notifications only</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These preferences control the bell icon in your workspace. Email notifications are coming soon.
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => handleToggleAll(true)}
          disabled={allEnabled || isPending}
        >
          <Bell className="size-3.5" />
          Enable all
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => handleToggleAll(false)}
          disabled={noneEnabled || isPending}
        >
          <BellOff className="size-3.5" />
          Disable all
        </Button>
      </div>

      {/* Preference cards */}
      <div className="flex flex-col gap-3">
        {PREF_DEFS.map(({ key, label, description, icon: Icon, iconColor }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.06 }}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors",
              prefs[key]
                ? "border-border bg-card"
                : "border-border/50 bg-muted/20",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                prefs[key] ? "bg-primary/10" : "bg-muted",
              )}>
                <Icon className={cn("size-4", prefs[key] ? iconColor : "text-muted-foreground")} />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={cn(
                  "text-sm font-medium transition-colors",
                  prefs[key] ? "text-foreground" : "text-muted-foreground",
                )}>
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            </div>
            <Toggle
              enabled={prefs[key]}
              onChange={(v) => handleToggle(key, v)}
              disabled={isPending}
            />
          </motion.div>
        ))}
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSave}
          size="sm"
          disabled={isPending || !isDirty}
          className="min-w-[120px]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              Saving…
            </span>
          ) : (
            "Save preferences"
          )}
        </Button>

        <AnimatePresence mode="wait">
          {savedState === "saved" && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <CheckCircle2 className="size-4" />
              Preferences saved
            </motion.span>
          )}
          {savedState === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              className="text-sm text-destructive"
            >
              Failed to save. Try again.
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
