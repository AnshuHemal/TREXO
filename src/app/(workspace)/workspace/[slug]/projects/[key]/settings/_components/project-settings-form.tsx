"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { updateProject, checkProjectKey } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectSettingsFormProps {
  projectId: string;
  workspaceId: string;
  workspaceSlug: string;
  initialName: string;
  initialKey: string;
  initialDescription: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectSettingsForm({
  projectId,
  workspaceId,
  workspaceSlug,
  initialName,
  initialKey,
  initialDescription,
}: ProjectSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [key, setKey] = useState(initialKey);
  const [description, setDescription] = useState(initialDescription);
  const [keyStatus, setKeyStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const keyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerKeyCheck(value: string) {
    if (keyDebounceRef.current) clearTimeout(keyDebounceRef.current);
    // If unchanged from initial, no need to check
    if (value === initialKey) {
      setKeyStatus("idle");
      return;
    }
    if (!value || value.length < 2) {
      setKeyStatus("idle");
      return;
    }
    setKeyStatus("checking");
    keyDebounceRef.current = setTimeout(async () => {
      const { available } = await checkProjectKey(workspaceId, value, projectId);
      setKeyStatus(available ? "available" : "taken");
    }, 400);
  }

  function handleKeyChange(value: string) {
    const cleaned = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 10);
    setKey(cleaned);
    setFieldErrors((p) => ({ ...p, key: "" }));
    setSuccessMessage(null);
    triggerKeyCheck(cleaned);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateProject(projectId, {
        name,
        key,
        description: description || undefined,
      });

      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }

      setSuccessMessage("Project settings saved.");

      // If key changed, navigate to new URL
      if (key !== initialKey) {
        window.location.href = `/workspace/${workspaceSlug}/projects/${key}/settings`;
      }
    });
  }

  const isDirty =
    name !== initialName ||
    key !== initialKey ||
    description !== initialDescription;

  const canSubmit =
    isDirty &&
    name.trim().length >= 2 &&
    key.trim().length >= 2 &&
    keyStatus !== "taken" &&
    keyStatus !== "checking" &&
    !isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="proj-name">Project name</Label>
        <Input
          id="proj-name"
          type="text"
          placeholder="My Project"
          autoComplete="off"
          required
          disabled={isPending}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setFieldErrors((p) => ({ ...p, name: "" }));
            setSuccessMessage(null);
          }}
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

      {/* Key */}
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
              Uppercase letters only, 2–10 chars. Changing the key will update all issue references.
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
          onChange={(e) => {
            setDescription(e.target.value);
            setSuccessMessage(null);
          }}
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

      {/* Server error / success */}
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
        {successMessage && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-3 text-sm text-primary"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </span>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
