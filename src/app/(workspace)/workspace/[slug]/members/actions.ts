"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { WorkspaceRole } from "@/generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ─── inviteMember ─────────────────────────────────────────────────────────────

export async function inviteMember(
  workspaceId: string,
  email: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();

  // Verify requester is OWNER or ADMIN
  const requesterMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: currentUser.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!requesterMembership) {
    return { success: false, error: "You don't have permission to invite members." };
  }

  // Validate email format
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, fieldErrors: { email: "Please enter a valid email address." } };
  }

  // Find user by email
  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!targetUser) {
    return {
      success: false,
      fieldErrors: { email: "No account found with this email address." },
    };
  }

  // Check not already a member
  const existingMembership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: targetUser.id },
    },
    select: { id: true },
  });

  if (existingMembership) {
    return {
      success: false,
      fieldErrors: { email: "This user is already a member of this workspace." },
    };
  }

  // Create membership
  try {
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: "MEMBER",
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to add member. Please try again." };
  }
}

// ─── updateMemberRole ─────────────────────────────────────────────────────────

export async function updateMemberRole(
  memberId: string,
  role: WorkspaceRole,
): Promise<ActionResult> {
  const currentUser = await requireUser();

  // Fetch the target membership to get workspaceId
  const targetMembership = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, workspaceId: true, role: true },
  });

  if (!targetMembership) {
    return { success: false, error: "Member not found." };
  }

  // Cannot change OWNER role
  if (targetMembership.role === "OWNER") {
    return { success: false, error: "The workspace owner's role cannot be changed." };
  }

  // Cannot assign OWNER role via this action
  if (role === "OWNER") {
    return { success: false, error: "Cannot assign the OWNER role." };
  }

  // Verify requester is OWNER or ADMIN in this workspace
  const requesterMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: targetMembership.workspaceId,
      userId: currentUser.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!requesterMembership) {
    return { success: false, error: "You don't have permission to change member roles." };
  }

  try {
    await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update role. Please try again." };
  }
}

// ─── removeMember ─────────────────────────────────────────────────────────────

export async function removeMember(
  memberId: string,
  workspaceId: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();

  // Fetch the target membership
  const targetMembership = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, userId: true },
  });

  if (!targetMembership) {
    return { success: false, error: "Member not found." };
  }

  // Cannot remove OWNER
  if (targetMembership.role === "OWNER") {
    return { success: false, error: "The workspace owner cannot be removed." };
  }

  // Verify requester is OWNER or ADMIN
  const requesterMembership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: currentUser.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!requesterMembership) {
    return { success: false, error: "You don't have permission to remove members." };
  }

  try {
    await prisma.workspaceMember.delete({ where: { id: memberId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove member. Please try again." };
  }
}
