"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { sendWorkspaceInvite } from "@/lib/invite-actions";
import type { WorkspaceRole } from "@/generated/prisma/enums";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function inviteMember(
  workspaceId: string,
  email: string,
): Promise<ActionResult> {

  return sendWorkspaceInvite(workspaceId, email);
}

export async function updateMemberRole(
  memberId: string,
  role: WorkspaceRole,
): Promise<ActionResult> {
  const currentUser = await requireUser();

  const targetMembership = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, workspaceId: true, role: true },
  });

  if (!targetMembership) {
    return { success: false, error: "Member not found." };
  }

  if (targetMembership.role === "OWNER") {
    return { success: false, error: "The workspace owner's role cannot be changed." };
  }

  if (role === "OWNER") {
    return { success: false, error: "Cannot assign the OWNER role." };
  }

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

export async function removeMember(
  memberId: string,
  workspaceId: string,
): Promise<ActionResult> {
  const currentUser = await requireUser();

  const targetMembership = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, userId: true },
  });

  if (!targetMembership) {
    return { success: false, error: "Member not found." };
  }

  if (targetMembership.role === "OWNER") {
    return { success: false, error: "The workspace owner cannot be removed." };
  }

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
