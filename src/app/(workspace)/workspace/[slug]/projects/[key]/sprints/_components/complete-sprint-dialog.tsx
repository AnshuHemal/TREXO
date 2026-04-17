"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, XCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { completeSprint } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OtherSprint {
  id: string;
  name: string;
}

interface CompleteSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprintId: string;
  sprintName: string;
  incompleteCount: number;
  otherSprints: OtherSprint[];
  onCompleted: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompleteSprintDialog({
  open,
  onOpenChange,
  sprintId,
  sprintName,
  incompleteCount,
  otherSprints,
  onCompleted,
}: CompleteSprintDialogProps) {
  const [destination, setDestination] = useState<string>("backlog");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    setServerError(null);
    startTransition(async () => {
      const result = await completeSprint({
        sprintId,
        incompleteAction: destination === "backlog" ? "backlog" : "next_sprint",
        targetSprintId: destination !== "backlog" ? destination : undefined,
      });

      if (!result.success) {
        setServerError(result.error ?? "Failed to complete sprint.");
        return;
      }

      onCompleted();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Complete sprint
            </DialogTitle>
            <DialogDescription>
              You&apos;re completing{" "}
              <span className="font-semibold text-foreground">{sprintName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            {incompleteCount > 0 ? (
              <>
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{incompleteCount}</span>{" "}
                    {incompleteCount === 1 ? "issue is" : "issues are"} incomplete.
                    Where should {incompleteCount === 1 ? "it" : "they"} go?
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Select value={destination} onValueChange={setDestination} disabled={isPending}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backlog">Move to backlog</SelectItem>
                      {otherSprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          Move to {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  All issues are done. The sprint will be marked as completed.
                </p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div key="se" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="size-4 shrink-0" />{serverError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={isPending}>
                {isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Completing…</span>
                  : "Complete sprint"
                }
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
