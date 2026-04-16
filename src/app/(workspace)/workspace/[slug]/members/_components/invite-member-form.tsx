"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, XCircle, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { inviteMember } from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InviteMemberFormProps {
  workspaceId: string;
  onMemberAdded?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InviteMemberForm({
  workspaceId,
  onMemberAdded,
}: InviteMemberFormProps) {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await inviteMember(workspaceId, email);

      if (!result.success) {
        if (result.fieldErrors?.email) setFieldError(result.fieldErrors.email);
        else if (result.error) setServerError(result.error);
        return;
      }

      setSuccessMessage(`${email} has been added to the workspace.`);
      setEmail("");
      onMemberAdded?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-email">Email address</Label>
        <div className="flex gap-2">
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@example.com"
            autoComplete="off"
            required
            disabled={isPending}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError(null);
              setSuccessMessage(null);
            }}
            className={cn(
              "flex-1",
              fieldError && "border-destructive",
            )}
          />
          <Button type="submit" disabled={!email.trim() || isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="mr-2 size-4" />
                Add member
              </>
            )}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {fieldError && (
            <motion.p
              key="fe"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-destructive"
            >
              {fieldError}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

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
    </form>
  );
}
