"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { canManageProject } from "@/lib/project-access";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ProjectRole = "LEAD" | "MEMBER" | "VIEWER";
export type ProjectVisibility = "PUBLIC" | "PRIVATE";

// ─── updateProjectVisibility ──────────────────────────────────────────────────

export async function updateProjectVisibility(
  projectId: string,
  visibility: ProjectVisibility,
): Promise<ActionResult> {
  const user = await requireUser();

  const allowed = await canManageProject(user.id, projectId);
  if (!allowed) return { success: false, error: "You don't have permission to change project visibility." };

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { visibility },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update visibility." };
  }
}

// ─── addProjectMember ─────────────────────────────────────────────────────────

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectRole = "MEMBER",
): Promise<ActionResult> {
  const actor = await requireUser();

  const allowed = await canManageProject(actor.id, projectId);
  if (!allowed) return { success: false, error: "You don't have permission to manage project members." };

  try {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role },
      update: { role },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add member." };
  }
}

// ─── removeProjectMember ──────────────────────────────────────────────────────

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  const actor = await requireUser();

  const allowed = await canManageProject(actor.id, projectId);
  if (!allowed) return { success: false, error: "You don't have permission to manage project members." };

  try {
    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove member." };
  }
}

// ─── updateProjectMemberRole ──────────────────────────────────────────────────

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<ActionResult> {
  const actor = await requireUser();

  const allowed = await canManageProject(actor.id, projectId);
  if (!allowed) return { success: false, error: "You don't have permission to manage project members." };

  try {
    await prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update role." };
  }
}
