"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Preference item ──────────────────────────────────────────────────────────

interface Preference {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

const PREFERENCES: Preference[] = [
  {
    id: "assigned",
    label: "Issue assigned to me",
    description: "When someone assigns an issue to you.",
    defaultEnabled: true,
  },
  {
    id: "mentioned",
    label: "Mentioned in a comment",
    description: "When someone @mentions you in a comment.",
    defaultEnabled: true,
  },
  {
    id: "status_changed",
    label: "Issue status changed",
    description: "When the status of an issue you reported changes.",
    defaultEnabled: false,
  },
  {
    id: "sprint_started",
    label: "Sprint started or completed",
    description: "When a sprint in your workspace starts or completes.",
    defaultEnabled: false,
  },
  {
    id: "comment_added",
    label: "New comment on my issues",
    description: "When someone comments on an issue you reported or are assigned to.",
    defaultEnabled: true,
  },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${enabled ? "bg-primary" : "bg-muted"}`}
    >
      <motion.span
        animate={{ x: enabled ? 16 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block size-4 rounded-full bg-white shadow-lg"
      />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationsForm() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(PREFERENCES.map((p) => [p.id, p.defaultEnabled])),
  );
  const [saved, setSaved] = useState(false);

  function handleToggle(id: string, value: boolean) {
    setPrefs((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  }

  function handleSave() {
    // TODO: persist to DB when notification system is built
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Coming soon banner */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Email notifications are coming soon. Your preferences will be saved and applied when the feature launches.
        </p>
      </div>

      {/* Preference list */}
      <div className="flex flex-col divide-y divide-border">
        {PREFERENCES.map(({ id, label, description }, i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <span className="text-xs text-muted-foreground">{description}</span>
            </div>
            <Toggle enabled={prefs[id]} onChange={(v) => handleToggle(id, v)} />
          </motion.div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} size="sm">
          Save preferences
        </Button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-sm text-primary"
          >
            <CheckCircle2 className="size-4" />
            Saved
          </motion.span>
        )}
      </div>
    </div>
  );
}
