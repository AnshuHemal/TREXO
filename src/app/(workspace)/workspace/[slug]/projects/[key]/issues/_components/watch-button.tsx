"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleWatchIssue } from "../watch-actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WatchButtonProps {
  issueId: string;
  initialWatching: boolean;
  initialWatcherCount: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WatchButton({
  issueId,
  initialWatching,
  initialWatcherCount,
}: WatchButtonProps) {
  const [watching, setWatching]         = useState(initialWatching);
  const [watcherCount, setWatcherCount] = useState(initialWatcherCount);
  const [isPending, startTransition]    = useTransition();
  const [showFeedback, setShowFeedback] = useState(false);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleWatchIssue(issueId);
      if (result.success && result.data) {
        setWatching(result.data.watching);
        setWatcherCount(result.data.watcherCount);
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={watching ? "default" : "outline"}
        size="sm"
        className={cn(
          "h-8 gap-2 text-xs transition-all",
          watching && "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
        )}
        onClick={handleToggle}
        disabled={isPending}
        aria-label={watching ? "Stop watching this issue" : "Watch this issue"}
        title={watching ? "Stop watching" : "Watch issue — get notified on updates"}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : watching ? (
          <BellOff className="size-3.5" />
        ) : (
          <Bell className="size-3.5" />
        )}
        {watching ? "Watching" : "Watch"}
        {watcherCount > 0 && (
          <motion.span
            key={watcherCount}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
              watching ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {watcherCount}
          </motion.span>
        )}
      </Button>

      {/* Feedback toast */}
      <AnimatePresence>
        {showFeedback && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] text-muted-foreground text-center"
          >
            {watching
              ? "You'll be notified of updates"
              : "You won't receive notifications"}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
