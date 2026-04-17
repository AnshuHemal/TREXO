"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Monitor, Smartphone, Globe, Loader2, XCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/lib/auth-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionItem {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface SessionsManagerProps {
  sessions: SessionItem[];
  currentToken: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDevice(userAgent: string | null): { label: string; icon: React.ElementType } {
  if (!userAgent) return { label: "Unknown device", icon: Globe };
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return { label: "Mobile device", icon: Smartphone };
  }
  return { label: "Desktop browser", icon: Monitor };
}

function parseBrowser(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Edg")) return "Edge";
  return "Browser";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionsManager({ sessions: initialSessions, currentToken }: SessionsManagerProps) {
  const [sessions, setSessions]       = useState(initialSessions);
  const [error, setError]             = useState<string | null>(null);
  const [revoking, setRevoking]       = useState<string | null>(null);
  const [isRevokingAll, startRevokeAllTransition] = useTransition();

  async function handleRevoke(token: string) {
    setRevoking(token);
    setError(null);
    const { error: err } = await authClient.revokeSession({ token });
    setRevoking(null);
    if (err) { setError(err.message ?? "Failed to revoke session."); return; }
    setSessions((prev) => prev.filter((s) => s.token !== token));
  }

  function handleRevokeOthers() {
    setError(null);
    startRevokeAllTransition(async () => {
      const { error: err } = await authClient.revokeOtherSessions();
      if (err) { setError(err.message ?? "Failed to sign out other sessions."); return; }
      setSessions((prev) => prev.filter((s) => s.token === currentToken));
    });
  }

  const otherSessions = sessions.filter((s) => s.token !== currentToken);

  return (
    <div className="flex flex-col gap-4">
      {/* Session list */}
      <div className="flex flex-col gap-2">
        {sessions.map((session, i) => {
          const isCurrent = session.token === currentToken;
          const { label, icon: DeviceIcon } = parseDevice(session.userAgent);
          const browser = parseBrowser(session.userAgent);
          const isRevoking = revoking === session.token;

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <DeviceIcon className="size-4 text-muted-foreground" />
              </div>

              <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {browser} · {label}
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      This device
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {session.ipAddress ? `${session.ipAddress} · ` : ""}
                  Signed in {formatDate(session.createdAt)}
                </span>
              </div>

              {!isCurrent && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={isRevoking || revoking !== null}
                  onClick={() => handleRevoke(session.token)}
                >
                  {isRevoking
                    ? <Loader2 className="size-4 animate-spin" />
                    : <LogOut className="size-4" />
                  }
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Revoke all others */}
      {otherSessions.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="self-start gap-1.5 text-destructive hover:text-destructive"
          disabled={isRevokingAll}
          onClick={handleRevokeOthers}
        >
          {isRevokingAll
            ? <><Loader2 className="size-4 animate-spin" />Signing out…</>
            : <><LogOut className="size-4" />Sign out all other sessions ({otherSessions.length})</>
          }
        </Button>
      )}

      <AnimatePresence mode="wait">
        {error && (
          <motion.div key="err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <XCircle className="size-4 shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
