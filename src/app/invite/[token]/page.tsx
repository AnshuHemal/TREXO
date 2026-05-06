import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AcceptInviteClient } from "./_components/accept-invite-client";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Look up the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true, image: true } },
    },
  });

  // Invalid token
  if (!invitation) notFound();

  // Already accepted
  if (invitation.acceptedAt) {
    redirect(`/workspace/${invitation.workspace.slug}`);
  }

  // Expired
  if (invitation.expiresAt < new Date()) {
    return (
      <InviteErrorPage
        title="Invitation expired"
        message="This invitation link has expired. Ask the workspace owner to send a new one."
      />
    );
  }

  // Check if user is logged in
  const session = await getSession();

  if (!session) {
    // Not logged in — redirect to signup with token preserved
    redirect(`/signup?invite=${token}`);
  }

  // Logged in — check if email matches
  const user = session.user;
  const emailMatches = user.email.toLowerCase() === invitation.email.toLowerCase();

  if (!emailMatches) {
    return (
      <InviteErrorPage
        title="Wrong account"
        message={`This invitation was sent to ${invitation.email}. Please sign in with that account to accept it.`}
      />
    );
  }

  // Check not already a member
  const alreadyMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspace.id,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (alreadyMember) {
    redirect(`/workspace/${invitation.workspace.slug}`);
  }

  return (
    <AcceptInviteClient
      token={token}
      workspaceName={invitation.workspace.name}
      workspaceSlug={invitation.workspace.slug}
      inviterName={invitation.invitedBy.name}
      inviterImage={invitation.invitedBy.image}
      inviteeEmail={invitation.email}
    />
  );
}

// ─── Error page ───────────────────────────────────────────────────────────────

function InviteErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_40%,var(--background)_100%)]"
      />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-md">
        <div className="mb-4 flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10">
            <span className="text-2xl">⚠️</span>
          </div>
        </div>
        <h1 className="mb-2 text-lg font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
