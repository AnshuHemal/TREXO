"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { Sun, Moon, Monitor, CheckCircle2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveUserTheme, type ThemeValue } from "@/lib/theme-actions";

// ─── Theme option config ──────────────────────────────────────────────────────

const THEME_OPTIONS: {
  value: ThemeValue;
  label: string;
  description: string;
  icon: React.ElementType;
  preview: { bg: string; border: string; text: string; muted: string; card: string };
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Clean white interface",
    icon: Sun,
    preview: {
      bg: "bg-white",
      border: "border-gray-200",
      text: "bg-gray-900",
      muted: "bg-gray-300",
      card: "bg-gray-50",
    },
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes",
    icon: Moon,
    preview: {
      bg: "bg-[#1a1a1a]",
      border: "border-[#2a2a2a]",
      text: "bg-gray-100",
      muted: "bg-[#3a3a3a]",
      card: "bg-[#242424]",
    },
  },
  {
    value: "system",
    label: "System",
    description: "Follows your OS setting",
    icon: Monitor,
    preview: {
      bg: "bg-gradient-to-br from-white to-[#1a1a1a]",
      border: "border-gray-400",
      text: "bg-gray-500",
      muted: "bg-gray-400",
      card: "bg-gray-200",
    },
  },
];

// ─── Mini preview card ────────────────────────────────────────────────────────

function ThemePreview({
  preview,
  selected,
}: {
  preview: (typeof THEME_OPTIONS)[0]["preview"];
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-24 w-full overflow-hidden rounded-lg border-2 transition-all duration-200",
        selected ? "border-primary shadow-md shadow-primary/20" : preview.border,
        preview.bg,
      )}
    >
      {/* Fake sidebar */}
      <div className={cn("absolute left-0 top-0 h-full w-8 border-r", preview.border, preview.card)}>
        <div className="flex flex-col gap-1 p-1.5 pt-2">
          <div className={cn("h-1.5 w-4 rounded-full", preview.muted)} />
          <div className={cn("h-1.5 w-3 rounded-full", preview.muted)} />
          <div className={cn("h-1.5 w-4 rounded-full", preview.muted)} />
        </div>
      </div>
      {/* Fake content */}
      <div className="absolute left-10 right-2 top-2 flex flex-col gap-1.5">
        <div className={cn("h-2 w-16 rounded-full", preview.text)} />
        <div className={cn("h-1.5 w-24 rounded-full", preview.muted)} />
        <div className={cn("mt-1 h-8 w-full rounded-md border", preview.border, preview.card)} />
      </div>
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary">
          <Check className="size-3 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppearanceFormProps {
  currentTheme: ThemeValue;
}

export function AppearanceForm({ currentTheme }: AppearanceFormProps) {
  const { setTheme } = useTheme();
  const [selected, setSelected] = useState<ThemeValue>(currentTheme);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSelect(value: ThemeValue) {
    if (value === selected || isPending) return;

    setSelected(value);
    setTheme(value);
    setStatus("saving");
    setErrorMsg(null);

    startTransition(async () => {
      await saveUserTheme(value);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Theme picker */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-base font-semibold text-foreground">Color theme</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Select a theme. Changes apply instantly and sync to all your devices.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ value, label, description, icon: Icon, preview }, i) => {
            const isSelected = selected === value;

            return (
              <motion.button
                key={value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i * 0.06 }}
                onClick={() => handleSelect(value)}
                disabled={isPending}
                className={cn(
                  "group flex flex-col gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                )}
                aria-pressed={isSelected}
                aria-label={`Select ${label} theme`}
              >
                {/* Preview */}
                <ThemePreview preview={preview} selected={isSelected} />

                {/* Label row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex size-7 items-center justify-center rounded-lg transition-colors",
                      isSelected ? "bg-primary/10" : "bg-muted",
                    )}>
                      <Icon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-semibold transition-colors",
                        isSelected ? "text-foreground" : "text-muted-foreground",
                      )}>
                        {label}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{description}</p>
                    </div>
                  </div>

                  {/* Active indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="flex size-5 items-center justify-center rounded-full bg-primary"
                      >
                        <Check className="size-3 text-primary-foreground" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Status feedback */}
        <AnimatePresence mode="wait">
          {status === "saving" && (
            <motion.p
              key="saving"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="mt-4 text-xs text-muted-foreground"
            >
              Saving preference…
            </motion.p>
          )}
          {status === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="size-3.5" />
              Theme saved — syncs to all your devices
            </motion.div>
          )}
          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center gap-2 text-xs font-medium text-destructive"
            >
              <AlertCircle className="size-3.5" />
              {errorMsg ?? "Failed to save theme."}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5"
      >
        <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Synced across devices</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your theme preference is stored in your account. When you sign in on a new device,
            your chosen theme loads automatically — no need to set it again.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
