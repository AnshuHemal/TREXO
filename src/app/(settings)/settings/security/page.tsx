import type { Metadata } from "next";
import { headers } from "next/headers";
import { requireUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { ChangePasswordForm } from "../_components/change-password-form";
import { ConnectedAccounts } from "../_components/connected-accounts";
import { SessionsManager } from "../_components/sessions-manager";

export const metadata: Metadata = { title: "Security Settings" };

export default async function SecuritySettingsPage() {
  const user = await requireUser();

  // Check if user has a password (email/password account)
  const passwordAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  });
  const hasPassword = !!passwordAccount;

  // Fetch connected accounts
  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    select: { id: true, providerId: true, accountId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Fetch active sessions
  const sessionsResponse = await auth.api.listSessions({
    headers: await headers(),
  });
  const sessions = sessionsResponse ?? [];

  // Current session token (to mark it as "this device")
  const currentSession = await auth.api.getSession({ headers: await headers() });
  const currentToken = currentSession?.session.token ?? "";

  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password, connected accounts, and active sessions.
        </p>
      </div>

      {/* Change password */}
      <FadeIn delay={0.05}>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-base font-semibold text-foreground">Password</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            {hasPassword
              ? "Update your account password."
              : "You signed up with OAuth. Set a password to also enable email/password login."}
          </p>
          <ChangePasswordForm hasPassword={hasPassword} />
        </div>
      </FadeIn>

      {/* Connected accounts */}
      <FadeIn delay={0.1}>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-base font-semibold text-foreground">Connected accounts</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Sign in with these providers or link additional ones.
          </p>
          <ConnectedAccounts
            accounts={accounts.map((a) => ({
              id: a.id,
              providerId: a.providerId,
              accountId: a.accountId,
              createdAt: a.createdAt,
            }))}
          />
        </div>
      </FadeIn>

      {/* Active sessions */}
      <FadeIn delay={0.15}>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-base font-semibold text-foreground">Active sessions</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Devices currently signed in to your account.
          </p>
          <SessionsManager
            sessions={sessions.map((s) => ({
              id: s.id,
              token: s.token,
              ipAddress: s.ipAddress ?? null,
              userAgent: s.userAgent ?? null,
              createdAt: s.createdAt,
              expiresAt: s.expiresAt,
            }))}
            currentToken={currentToken}
          />
        </div>
      </FadeIn>
    </FadeIn>
  );
}
