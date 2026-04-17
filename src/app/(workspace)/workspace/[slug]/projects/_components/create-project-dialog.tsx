"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createProject, checkProjectKey } from "../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a project key from a name.
 * - Multi-word: first letter of each word, uppercase, max 3 chars. e.g. "Trexo App" → "TRA"
 * - Single word: first 3 letters uppercase. e.g. "Backend" → "BAC"
 */
function nameToKey(name: string): string {
  const words = name.trim().split(/[\s\-_/\\]+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) {
    return words[0].replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
  }
  return words
    .map((w) => w.replace(/[^a-zA-Z]/g, "").charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateProjectDialogProps {
  workspaceId: string;
  workspaceSlug: string;
  trigger?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateProjectDialog({
  workspaceId,
  workspaceSlug,
  trigger,
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [keyStatus, setKeyStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const keyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerKeyCheck(value: string) {
    if (keyDebounceRef.current) clearTimeout(keyDebounceRef.current);
    if (!value || value.length < 2) {
      setKeyStatus("idle");
      return;
    }
    setKeyStatus("checking");
    keyDebounceRef.current = setTimeout(async () => {
      const { available } = await checkProjectKey(workspaceId, value);
      setKeyStatus(available ? "available" : "taken");
    }, 400);
  }

  function handleNameChange(value: string) {
    setName(value);
    setFieldErrors((p) => ({ ...p, name: "" }));
    setServerError(null);
    if (!keyEdited) {
      const derived = nameToKey(value);
      setKey(derived);
      triggerKeyCheck(derived);
    }
  }

  function handleKeyChange(value: string) {
    // Force uppercase, only A-Z letters, max 10 chars
    const cleaned = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 10);
    setKeyEdited(true);
    setKey(cleaned);
    setFieldErrors((p) => ({ ...p, key: "" }));
    setServerError(null);
    triggerKeyCheck(cleaned);
  }

  function resetForm() {
    setName("");
    setKey("");
    setKeyEdited(false);
    setDescription("");
    setKeyStatus("idle");
    setFieldErrors({});
    setServerError(null);
    if (keyDebounceRef.current) clearTimeout(keyDebounceRef.current);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    setOpen(next);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const result = await createProject(workspaceId, {
        name,
        key,
        description: description || undefined,
      });

      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }

      // Navigate to the new project
      window.location.href = `/workspace/${workspaceSlug}/projects/${result.data!.key}`;
    });
  }

  const canSubmit =
    name.trim().length >= 2 &&
    key.trim().length >= 2 &&
    keyStatus !== "taken" &&
    keyStatus !== "checking" &&
    !isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            New project
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 4 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
            <DialogDescription>
              Add a new project to your workspace. You can change these settings later.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
            {/* Project name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-name">Project name</Label>
              <Input
                id="proj-name"
                type="text"
                placeholder="My Awesome Project"
                autoComplete="off"
                required
                disabled={isPending}
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className={cn(fieldErrors.name && "border-destructive")}
              />
              <AnimatePresence mode="wait">
                {fieldErrors.name && (
                  <motion.p
                    key="name-err"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-destructive"
                  >
                    {fieldErrors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Project key */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-key">Project key</Label>
              <div
                className={cn(
                  "flex items-center rounded-md border bg-background transition-all",
                  "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                  fieldErrors.key || keyStatus === "taken"
                    ? "border-destructive"
                    : "border-border",
                )}
              >
                <input
                  id="proj-key"
                  type="text"
                  placeholder="TRX"
                  autoComplete="off"
                  required
                  disabled={isPending}
                  value={key}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-sm font-mono uppercase tracking-widest outline-none placeholder:text-muted-foreground placeholder:normal-case placeholder:tracking-normal"
                />
                <div className="pr-3">
                  <AnimatePresence mode="wait">
                    {keyStatus === "checking" && (
                      <motion.span
                        key="c"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </motion.span>
                    )}
                    {keyStatus === "available" && (
                      <motion.span
                        key="a"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <CheckCircle2 className="size-4 text-primary" />
                      </motion.span>
                    )}
                    {keyStatus === "taken" && (
                      <motion.span
                        key="t"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <XCircle className="size-4 text-destructive" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {fieldErrors.key ? (
                  <motion.p
                    key="fe"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-destructive"
                  >
                    {fieldErrors.key}
                  </motion.p>
                ) : keyStatus === "taken" ? (
                  <motion.p
                    key="tk"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-destructive"
                  >
                    This key is already taken.
                  </motion.p>
                ) : (
                  <motion.p
                    key="ht"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted-foreground"
                  >
                    Uppercase letters only, 2–10 chars. Used to prefix issue numbers (e.g.{" "}
                    {key || "TRX"}-42).
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="proj-desc">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="proj-desc"
                placeholder="What is this project about?"
                disabled={isPending}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className={cn(
                  "resize-none",
                  fieldErrors.description && "border-destructive",
                )}
              />
              <div className="flex items-center justify-between">
                <AnimatePresence mode="wait">
                  {fieldErrors.description && (
                    <motion.p
                      key="desc-err"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-destructive"
                    >
                      {fieldErrors.description}
                    </motion.p>
                  )}
                </AnimatePresence>
                <span className="ml-auto text-xs text-muted-foreground">
                  {description.length}/500
                </span>
              </div>
            </div>

            {/* Server error */}
            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div
                  key="se"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  <XCircle className="size-4 shrink-0" />
                  {serverError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </span>
                ) : (
                  "Create project"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
