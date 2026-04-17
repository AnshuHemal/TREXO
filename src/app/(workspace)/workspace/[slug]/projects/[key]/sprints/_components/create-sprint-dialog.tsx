"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Loader2, XCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createSprint, updateSprint } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateSprintDialogProps {
  projectId: string;
  /** If provided, the dialog is in edit mode */
  sprint?: {
    id: string;
    name: string;
    goal: string | null;
    startDate: Date | null;
    endDate: Date | null;
  };
  trigger?: React.ReactNode;
  onSuccess: (sprintId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toInputDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

function fromInputDate(value: string): Date | null {
  if (!value) return null;
  return new Date(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateSprintDialog({
  projectId,
  sprint,
  trigger,
  onSuccess,
}: CreateSprintDialogProps) {
  const isEdit = !!sprint;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sprint?.name ?? "");
  const [goal, setGoal] = useState(sprint?.goal ?? "");
  const [startDate, setStartDate] = useState(toInputDate(sprint?.startDate));
  const [endDate, setEndDate] = useState(toInputDate(sprint?.endDate));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    if (!isEdit) {
      setName("");
      setGoal("");
      setStartDate("");
      setEndDate("");
    }
    setFieldErrors({});
    setServerError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      if (isEdit) {
        const result = await updateSprint(sprint.id, {
          name,
          goal: goal || undefined,
          startDate: fromInputDate(startDate),
          endDate: fromInputDate(endDate),
        });

        if (!result.success) {
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          if (result.error) setServerError(result.error);
          return;
        }

        onSuccess(sprint.id);
        handleOpenChange(false);
      } else {
        const result = await createSprint({
          projectId,
          name,
          goal: goal || undefined,
          startDate: fromInputDate(startDate),
          endDate: fromInputDate(endDate),
        });

        if (!result.success) {
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          if (result.error) setServerError(result.error);
          return;
        }

        onSuccess(result.data!.id);
        handleOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant={isEdit ? "ghost" : "default"}>
            {isEdit ? (
              <Pencil className="size-4" />
            ) : (
              <>
                <Plus className="mr-1.5 size-4" />
                New sprint
              </>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit sprint" : "Create sprint"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sprint-name">Sprint name</Label>
              <Input
                id="sprint-name"
                placeholder="Sprint 1"
                autoFocus
                required
                disabled={isPending}
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: "" })); }}
                className={cn(fieldErrors.name && "border-destructive")}
              />
              <AnimatePresence mode="wait">
                {fieldErrors.name && (
                  <motion.p key="ne" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive">
                    {fieldErrors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Goal */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sprint-goal">
                Sprint goal{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="sprint-goal"
                placeholder="What do you want to achieve in this sprint?"
                disabled={isPending}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sprint-start">Start date</Label>
                <Input
                  id="sprint-start"
                  type="date"
                  disabled={isPending}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sprint-end">End date</Label>
                <Input
                  id="sprint-end"
                  type="date"
                  disabled={isPending}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Server error */}
            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div key="se" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="size-4 shrink-0" />{serverError}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isPending}>
                {isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{isEdit ? "Saving…" : "Creating…"}</span>
                  : isEdit ? "Save changes" : "Create sprint"
                }
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
