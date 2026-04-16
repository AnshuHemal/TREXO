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
import { deleteProject } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectDangerZoneProps {
  projectId: string;
  projectName: string;
  workspaceSlug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDangerZone({
  projectId,
  projectName,
  workspaceSlug,
}: ProjectDangerZoneProps) {
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmValue === projectName;

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
        await deleteProject(projectId, workspaceSlug);
        // deleteProject redirects server-side; if we get here something went wrong
        window.location.href = `/workspace/${workspaceSlug}`;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete project. Please try again.",
        );
      }
    });
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">Delete project</p>
        <p className="text-xs text-muted-foreground">
          Permanently delete this project and all its issues, sprints, and data. This cannot be undone.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 size-4" />
            Delete project
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {projectName}
              </span>{" "}
              and all its issues, sprints, and data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="confirm-proj-name" className="text-sm">
              Type{" "}
              <span className="font-semibold text-foreground">
                {projectName}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-proj-name"
              type="text"
              placeholder={projectName}
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
                "Delete project"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
