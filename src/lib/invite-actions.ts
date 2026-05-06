"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sendInviteEmail } from "@/lib/email";
import { siteConfig } from "@/config/site";
import { randomBytes } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ─── sendWorkspaceInvite ──────────────────────────────────────────────────────

/**
 * Creates an Invitation record and sends an invite email via Brevo SMTP.
 *
 * Flow:
 *  1. Validate requester is OWNER or ADMIN
 *  2. Validate email format
 *  3. Check not already a member
 *  4. Check no pending unexpired invite for this email
 *  5. Create Invitation with a secure random token (7-day expiry)
 *  6. Send invite email with accept link
 */
export async function sendWorkspaceInvite(
  workspaceId: string,
  email: string,
): Promise<ActionResult> {
  const actor = await requireUser();

  // Permission check
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: actor.id, role: { in: ["OWNER", "ADMIN"] } },
    include: { workspace: { select: { name: true, slug: true } } },
  });

  if (!membership) {
    return { success: false, error: "You don't have permission to invite members." };
  }

  // Validate email
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, fieldErrors: { email: "Please enter a valid email address." } };
  }

  // Check not already a member
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      select: { id: true },
    });
    if (alreadyMember) {
      return { success: false, fieldErrors: { email: "This user is already a member." } };
    }
  }

  // Check no active pending invite
  const existingInvite = await prisma.invitation.findFirst({
    where: {
      workspaceId,
      email: normalizedEmail,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (existingInvite) {
    return {
      success: false,
      fieldErrors: { email: "An invitation has already been sent to this email." },
    };
  }

  // Generate secure token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await prisma.invitation.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role: "MEMBER",
        token,
        invitedById: actor.id,
        expiresAt,
      },
    });

    // Build accept URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send email — await it so errors surface in server logs
    try {
      await sendInviteEmail({
        to: normalizedEmail,
        inviterName: actor.name,
        workspaceName: membership.workspace.name,
        inviteUrl,
      });
    } catch (err) {
      console.error("[Invite] Email send failed:", err);
      // Don't fail the whole action — invitation record is created, link still works
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to send invitation. Please try again." };
  }
}

// ─── resendWorkspaceInvite ────────────────────────────────────────────────────

export async function resendWorkspaceInvite(
  invitationId: string,
): Promise<ActionResult> {
  const actor = await requireUser();

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      workspace: { select: { name: true, slug: true, id: true } },
    },
  });

  if (!invitation) return { success: false, error: "Invitation not found." };

  // Permission check
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invitation.workspaceId,
      userId: actor.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) return { success: false, error: "Permission denied." };

  // Refresh token + expiry
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { token, expiresAt },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? siteConfig.url;
  const inviteUrl = `${baseUrl}/invite/${token}`;

  sendInviteEmail({
    to: invitation.email,
    inviterName: actor.name,
    workspaceName: invitation.workspace.name,
    inviteUrl,
  }).catch((err) => console.error("[Invite] Resend failed:", err));

  return { success: true };
}

// ─── revokeWorkspaceInvite ────────────────────────────────────────────────────

export async function revokeWorkspaceInvite(
  invitationId: string,
): Promise<ActionResult> {
  const actor = await requireUser();

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { workspaceId: true },
  });

  if (!invitation) return { success: false, error: "Invitation not found." };

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: invitation.workspaceId,
      userId: actor.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) return { success: false, error: "Permission denied." };

  await prisma.invitation.delete({ where: { id: invitationId } });
  return { success: true };
}

// ─── getPendingInvitations ────────────────────────────────────────────────────

export async function getPendingInvitations(workspaceId: string) {
  await requireUser();

  return prisma.invitation.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: { select: { name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
