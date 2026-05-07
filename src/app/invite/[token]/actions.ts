"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { redirect } from "next/navigation";

export async function acceptInvitation(token: string): Promise<{ error?: string }> {
  const user = await requireUser();

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { workspace: { select: { id: true, slug: true } } },
  });

  if (!invitation) return { error: "Invitation not found." };
  if (invitation.acceptedAt) {
    redirect(`/workspace/${invitation.workspace.slug}`);
  }
  if (invitation.expiresAt < new Date()) return { error: "This invitation has expired." };
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "This invitation was sent to a different email address." };
  }

  const existing = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: invitation.workspace.id,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspace.id,
          userId: user.id,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);
  }

  redirect(`/workspace/${invitation.workspace.slug}`);
}
