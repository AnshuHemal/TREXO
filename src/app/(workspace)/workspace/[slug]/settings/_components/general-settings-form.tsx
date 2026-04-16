"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { updateWorkspace, checkWorkspaceSlug } from "../actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

async function checkSlugAvailable(
  slug: string,
  currentSlug: string,
): Promise<boolean> {
  if (slug === currentSlug) return true;
  const { available } = await checkWorkspaceSlug(slug);
  return available;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface GeneralSettingsFormProps {
  workspaceId: string;
  initialName: string;
  initialSlug: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneralSettingsForm({
  workspaceId,
  initialName,
  initialSlug,
}: GeneralSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSlugCheck(value: string) {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (!value || value.length < 2) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    slugDebounceRef.current = setTimeout(async () => {
      const available = await checkSlugAvailable(value, initialSlug);
      setSlugStatus(available ? "available" : "taken");
    }, 400);
  }

  function handleNameChange(value: string) {
    setName(value);
    setFieldErrors((p) => ({ ...p, name: "" }));
    setSuccessMessage(null);
    if (!slugEdited) {
      const derived = nameToSlug(value);
      setSlug(derived);
      triggerSlugCheck(derived);
    }
  }

  function handleSlugChange(value: string) {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlugEdited(true);
    setSlug(cleaned);
    setFieldErrors((p) => ({ ...p, slug: "" }));
    setSuccessMessage(null);
    triggerSlugCheck(cleaned);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await updateWorkspace(workspaceId, { name, slug });

      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }

      setSuccessMessage("Workspace settings saved.");

      // If slug changed, navigate to new URL
      if (slug !== initialSlug) {
        window.location.href = `/workspace/${slug}/settings`;
      }
    });
  }

  const isDirty = name !== initialName || slug !== initialSlug;
  const canSubmit =
    isDirty &&
    name.trim().length >= 2 &&
    slug.trim().length >= 2 &&
    slugStatus !== "taken" &&
    slugStatus !== "checking" &&
    !isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          type="text"
          placeholder="Acme Inc."
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

      {/* Slug */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ws-slug">Workspace URL</Label>
        <div
          className={cn(
            "flex items-center rounded-md border bg-background transition-all",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            fieldErrors.slug || slugStatus === "taken"
              ? "border-destructive"
              : "border-border",
          )}
        >
          <span className="select-none border-r border-border px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">
            trexo.com/
          </span>
          <div className="flex flex-1 items-center">
            <input
              id="ws-slug"
              type="text"
              placeholder="acme-inc"
              autoComplete="off"
              required
              disabled={isPending}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="pr-3">
              <AnimatePresence mode="wait">
                {slugStatus === "checking" && (
                  <motion.span
                    key="c"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </motion.span>
                )}
                {slugStatus === "available" && slug !== initialSlug && (
                  <motion.span
                    key="a"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <CheckCircle2 className="size-4 text-primary" />
                  </motion.span>
                )}
                {slugStatus === "taken" && (
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
        </div>

        <AnimatePresence mode="wait">
          {fieldErrors.slug ? (
            <motion.p
              key="fe"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-destructive"
            >
              {fieldErrors.slug}
            </motion.p>
          ) : slugStatus === "taken" ? (
            <motion.p
              key="tk"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-destructive"
            >
              This URL is already taken.
            </motion.p>
          ) : (
            <motion.p
              key="ht"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground"
            >
              Only lowercase letters, numbers, and hyphens.
            </motion.p>
          )}
        </AnimatePresence>
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
