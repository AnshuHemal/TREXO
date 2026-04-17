"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface RealtimeIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RealtimeIndicator({ status, className }: RealtimeIndicatorProps) {
  const [showLabel, setShowLabel] = useState(false);

  // Show label briefly on status change
  useEffect(() => {
    if (status === "connected" || status === "disconnected") {
      setShowLabel(true);
      const t = setTimeout(() => setShowLabel(false), 3000);
      return () => clearTimeout(t);
    }
  }, [status]);

  return (
    <div
      className={cn("flex items-center gap-1.5", className)}
      title={
        status === "connected"
          ? "Real-time updates active"
          : status === "connecting"
          ? "Connecting…"
          : "Disconnected — reconnecting…"
      }
    >
      {/* Dot indicator */}
      <div className="relative flex items-center justify-center">
        {status === "connected" && (
          <motion.span
            className="absolute inline-flex size-3 rounded-full bg-emerald-500/30"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full transition-colors duration-500",
            status === "connected"    && "bg-emerald-500",
            status === "connecting"   && "bg-amber-400 animate-pulse",
            status === "disconnected" && "bg-red-500",
          )}
        />
      </div>

      {/* Label — shown briefly on change */}
      <AnimatePresence>
        {showLabel && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "overflow-hidden whitespace-nowrap text-[10px] font-medium",
              status === "connected"    && "text-emerald-600 dark:text-emerald-400",
              status === "disconnected" && "text-red-500",
            )}
          >
            {status === "connected" ? "Live" : "Reconnecting…"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Toast-style reconnect banner ─────────────────────────────────────────────

interface ReconnectBannerProps {
  show: boolean;
}

export function ReconnectBanner({ show }: ReconnectBannerProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed left-1/2 top-4 z-100 -translate-x-1/2"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 shadow-lg dark:border-amber-800/50 dark:bg-amber-950/80">
            <WifiOff className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Connection lost — reconnecting…
            </span>
            <motion.div
              className="size-3 rounded-full border-2 border-amber-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── "Updated by someone else" toast ─────────────────────────────────────────

interface LiveUpdateToastProps {
  message: string;
  show: boolean;
}

export function LiveUpdateToast({ message, show }: LiveUpdateToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary shadow-sm"
        >
          <Wifi className="size-3.5 shrink-0" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
