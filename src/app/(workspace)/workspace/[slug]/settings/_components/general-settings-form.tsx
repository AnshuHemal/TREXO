"use client";

import { useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2, Camera, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { updateWorkspace, updateWorkspaceLogo, checkWorkspaceSlug } from "../actions";

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
  initialLogo?: string | null;
  workspaceName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneralSettingsForm({
  workspaceId,
  initialName,
  initialSlug,
  initialLogo = null,
}: GeneralSettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSaving, startLogoTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo must be smaller than 2 MB.");
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogo(base64);
      // Auto-save logo immediately
      startLogoTransition(async () => {
        const result = await updateWorkspaceLogo(workspaceId, base64);
        if (!result.success) setLogoError(result.error ?? "Failed to save logo.");
        else setLogoFile(null);
      });
    };
    reader.readAsDataURL(file);
  }

  async function handleRemoveLogo() {
    setLogo(null);
    setLogoFile(null);
    startLogoTransition(async () => {
      await updateWorkspaceLogo(workspaceId, null);
    });
  }

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
      {/* Workspace logo */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="size-16 rounded-xl">
            <AvatarImage src={logo ?? undefined} alt={name} className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {name.charAt(0).toUpperCase() || <Building2 className="size-6" />}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoSaving}
            className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110 disabled:opacity-50"
            aria-label="Change workspace logo"
          >
            {logoSaving ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={handleLogoChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Workspace logo</p>
          <p className="text-sm text-muted-foreground">PNG, JPG, WebP or SVG. Max 2 MB.</p>
          {logo && (
            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={logoSaving}
              className="text-sm text-destructive hover:underline disabled:opacity-50"
            >
              Remove logo
            </button>
          )}
          {logoError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-destructive"
            >
              {logoError}
            </motion.p>
          )}
        </div>
      </div>

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
              className="text-sm text-destructive"
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
            trexo-web.vercel.app/
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
              className="text-sm text-destructive"
            >
              {fieldErrors.slug}
            </motion.p>
          ) : slugStatus === "taken" ? (
            <motion.p
              key="tk"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive"
            >
              This URL is already taken.
            </motion.p>
          ) : (
            <motion.p
              key="ht"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground"
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
