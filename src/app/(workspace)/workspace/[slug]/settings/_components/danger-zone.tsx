"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteWorkspace } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface DangerZoneProps {
  workspaceId: string;
  workspaceName: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DangerZone({ workspaceId, workspaceName }: DangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmValue === workspaceName;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmValue("");
      setError(null);
    }
    setOpen(next);
  }

  function handleDelete() {
    if (!isConfirmed) return;
    setError(null);

    startTransition(async () => {
      try {
        await deleteWorkspace(workspaceId);
        // deleteWorkspace redirects server-side; if we get here something went wrong
        window.location.href = "/onboarding";
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete workspace. Please try again.",
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Delete workspace</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete this workspace and all its data. This cannot be undone.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 size-4" />
            Delete workspace
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {workspaceName}
              </span>{" "}
              and all its projects, issues, and members. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="confirm-name" className="text-sm">
              Type{" "}
              <span className="font-semibold text-foreground">
                {workspaceName}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-name"
              type="text"
              placeholder={workspaceName}
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!isConfirmed || isPending}
              onClick={handleDelete}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </span>
              ) : (
                "Delete workspace"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
