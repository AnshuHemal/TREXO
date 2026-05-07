"use client";

import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/logo";
import { acceptInvitation } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface AcceptInviteClientProps {
  token: string;
  workspaceName: string;
  workspaceSlug: string;
  inviterName: string;
  inviterImage: string | null;
  inviteeEmail: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AcceptInviteClient({
  token,
  workspaceName,
  inviterName,
  inviterImage,
  inviteeEmail,
}: AcceptInviteClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitation(token);
      if (result?.error) setError(result.error);
      // On success, acceptInvitation redirects server-side
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_40%,var(--background)_100%)]"
      />

      {/* Logo */}
      <div className="absolute left-6 top-6 z-10">
        <Logo size={24} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-2xl border border-border bg-card p-8 shadow-md">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Users className="size-7 text-primary" />
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              You&apos;re invited!
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Join <span className="font-semibold text-foreground">{workspaceName}</span> on Trexo
            </p>
          </div>

          {/* Inviter info */}
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={inviterImage ?? undefined} />
              <AvatarFallback className="text-sm font-semibold">
                {getInitials(inviterName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{inviterName}</p>
              <p className="text-sm text-muted-foreground">invited you to this workspace</p>
            </div>
          </div>

          {/* Invitee email */}
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Accepting as <span className="font-medium text-foreground">{inviteeEmail}</span>
          </p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Accept button */}
          <Button
            className="w-full gap-2"
            onClick={handleAccept}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Joining workspace…
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Accept invitation
              </>
            )}
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            By accepting, you agree to collaborate in this workspace.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
