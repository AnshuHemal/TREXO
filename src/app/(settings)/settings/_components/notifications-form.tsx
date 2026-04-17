"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, UserCheck, AtSign, ArrowRightLeft,
  MessageSquare, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveNotificationPrefs, type NotificationPrefs } from "../actions";

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
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        enabled ? "bg-primary" : "bg-muted",
      )}
    >
      <motion.span
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg mt-0.5"
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
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDirty = JSON.stringify(prefs) !== JSON.stringify(initialPrefs);

  function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    setErrorMsg(null);
    startTransition(async () => {
      const result = await saveNotificationPrefs(prefs);
      if (result.success) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setErrorMsg(result.error ?? "Failed to save preferences.");
      }
    });
  }

  function handleEnableAll() {
    setPrefs({ assigned: true, mentioned: true, statusChanged: true, commentAdded: true });
    setStatus("idle");
  }

  function handleDisableAll() {
    setPrefs({ assigned: false, mentioned: false, statusChanged: false, commentAdded: false });
    setStatus("idle");
  }

  const allEnabled  = Object.values(prefs).every(Boolean);
  const allDisabled = Object.values(prefs).every((v) => !v);

  return (
    <div className="flex flex-col gap-6">
      {/* In-app only notice */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3.5"
      >
        <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">In-app notifications only</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These preferences control the bell icon in the topbar. Email notifications are coming soon.
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick select:</span>
        <button
          type="button"
          onClick={handleEnableAll}
          disabled={allEnabled || isPending}
          className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Enable all
        </button>
        <span className="text-muted-foreground/40">·</span>
        <button
          type="button"
          onClick={handleDisableAll}
          disabled={allDisabled || isPending}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Disable all
        </button>
      </div>

      {/* Preference cards */}
      <div className="flex flex-col gap-2">
        {PREF_DEFS.map(({ key, label, description, icon: Icon, iconColor }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: i * 0.06 }}
            className={cn(
              "flex items-center justify-between gap-4 rounded-xl border px-4 py-4 transition-colors",
              prefs[key]
                ? "border-border bg-card"
                : "border-border/50 bg-muted/20",
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
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
          {status === "saved" && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <CheckCircle2 className="size-4" />
              Preferences saved
            </motion.span>
          )}
          {status === "error" && (
            <motion.span
              key="error"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-sm text-destructive"
            >
              <AlertCircle className="size-4" />
              {errorMsg}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
