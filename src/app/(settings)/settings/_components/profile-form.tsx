"use client";

import { useState, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileForm({ initialName, initialEmail, initialImage }: ProfileFormProps) {
  const [name, setName]           = useState(initialName);
  const [image, setImage]         = useState<string | null>(initialImage);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [status, setStatus]       = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage]     = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  const isDirty = name !== initialName || imageFile !== null;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus("error");
      setMessage("Image must be smaller than 2 MB.");
      return;
    }
    setImageFile(file);
    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setMessage(null);

    startTransition(async () => {
      // For avatar: in production, upload to Uploadthing/R2 and get URL.
      // Here we use the base64 preview directly (works for demo; swap for real upload URL).
      const imageUrl = imageFile ? image : undefined;

      const { error } = await authClient.updateUser({
        name: name.trim(),
        ...(imageUrl !== undefined ? { image: imageUrl } : {}),
      });

      if (error) {
        setStatus("error");
        setMessage(error.message ?? "Failed to update profile.");
        return;
      }

      setStatus("success");
      setMessage("Profile updated successfully.");
      setImageFile(null);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <Avatar className="size-20">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback className="text-xl font-semibold">
              {getInitials(name || initialEmail)}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-110"
            aria-label="Change avatar"
          >
            <Camera className="size-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleImageChange}
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">PNG, JPG or WebP. Max 2 MB.</p>
          {imageFile && (
            <button
              type="button"
              onClick={() => { setImage(initialImage); setImageFile(null); }}
              className="text-xs text-destructive hover:underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display-name">Display name</Label>
        <Input
          id="display-name"
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setStatus("idle"); }}
          placeholder="Your name"
          required
          disabled={isPending}
          className="max-w-sm"
        />
      </div>

      {/* Email — read-only */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={initialEmail}
          readOnly
          disabled
          className="max-w-sm cursor-not-allowed opacity-60"
        />
        <p className="text-xs text-muted-foreground">
          Email changes require OTP verification and are not yet supported in the UI.
        </p>
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {status === "success" && message && (
          <motion.div key="ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 text-sm font-medium text-primary">
            <CheckCircle2 className="size-4 shrink-0" />{message}
          </motion.div>
        )}
        {status === "error" && message && (
          <motion.div key="err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="size-4 shrink-0" />{message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={!isDirty || isPending}>
          {isPending ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Saving…</span> : "Save changes"}
        </Button>
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => { setName(initialName); setImage(initialImage); setImageFile(null); setStatus("idle"); }}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
