"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChangePasswordFormProps {
  hasPassword: boolean;
}

function getPasswordStrength(p: string): "empty" | "weak" | "fair" | "strong" {
  if (!p) return "empty";
  if (p.length < 8) return "weak";
  if (p.length < 12) return "fair";
  return "strong";
}

export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const [current, setCurrent]         = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus]           = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage]         = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const strength = getPasswordStrength(newPw);
  const strengthWidth = strength === "empty" ? "0%" : strength === "weak" ? "33%" : strength === "fair" ? "66%" : "100%";
  const strengthColor = strength === "weak" ? "bg-destructive" : strength === "fair" ? "bg-primary/50" : "bg-primary";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("idle");
    setMessage(null);

    if (newPw.length < 8) { setStatus("error"); setMessage("Password must be at least 8 characters."); return; }
    if (newPw !== confirm) { setStatus("error"); setMessage("Passwords do not match."); return; }

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: hasPassword ? current : undefined as never,
        newPassword: newPw,
        revokeOtherSessions: true,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message ?? "Failed to change password.");
        return;
      }

      setStatus("success");
      setMessage("Password updated. Other sessions have been signed out.");
      setCurrent(""); setNewPw(""); setConfirm("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
      {/* Current password — only for users who already have one */}
      {hasPassword && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="current-pw">Current password</Label>
          <div className="relative">
            <Input id="current-pw" type={showCurrent ? "text" : "password"} value={current}
              onChange={(e) => { setCurrent(e.target.value); setStatus("idle"); }}
              placeholder="••••••••" autoComplete="current-password" required disabled={isPending} className="pr-10" />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} disabled={isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      )}

      {/* New password */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-pw">{hasPassword ? "New password" : "Password"}</Label>
        <div className="relative">
          <Input id="new-pw" type={showNew ? "text" : "password"} value={newPw}
            onChange={(e) => { setNewPw(e.target.value); setStatus("idle"); }}
            placeholder="Min. 8 characters" autoComplete="new-password" required disabled={isPending} className="pr-10" />
          <button type="button" onClick={() => setShowNew((v) => !v)} disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {/* Strength bar */}
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
          <motion.div className={cn("h-full rounded-full transition-colors duration-300", strengthColor)}
            animate={{ width: strengthWidth }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
        </div>
      </div>

      {/* Confirm */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-pw">Confirm password</Label>
        <div className="relative">
          <Input id="confirm-pw" type={showConfirm ? "text" : "password"} value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
            placeholder="••••••••" autoComplete="new-password" required disabled={isPending} className="pr-10" />
          <button type="button" onClick={() => setShowConfirm((v) => !v)} disabled={isPending}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
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

      <Button type="submit" disabled={isPending || !newPw || !confirm || (hasPassword && !current)} className="self-start">
        {isPending ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Saving…</span>
          : hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}
