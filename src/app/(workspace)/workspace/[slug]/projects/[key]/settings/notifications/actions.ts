"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── getProjectNotificationSettings ──────────────────────────────────────────

/**
 * Returns whether the current user has muted this project.
 */
export async function getProjectNotificationSettings(
  projectId: string,
): Promise<ActionResult<{ muted: boolean }>> {
  const user = await requireUser();

  try {
    const mute = await prisma.projectNotificationMute.findUnique({
      where: { userId_projectId: { userId: user.id, projectId } },
      select: { id: true },
    });

    return { success: true, data: { muted: !!mute } };
  } catch {
    return { success: false, error: "Failed to load notification settings." };
  }
}

// ─── setProjectMuted ──────────────────────────────────────────────────────────

/**
 * Mute or unmute a project for the current user.
 */
export async function setProjectMuted(
  projectId: string,
  muted: boolean,
): Promise<ActionResult> {
  const user = await requireUser();

  // Verify the project exists and the user is a workspace member
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true, name: true },
  });

  if (!project) return { success: false, error: "Project not found." };

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: project.workspaceId, userId: user.id },
    select: { id: true },
  });

  if (!membership) return { success: false, error: "You are not a member of this workspace." };

  try {
    if (muted) {
      await prisma.projectNotificationMute.upsert({
        where: { userId_projectId: { userId: user.id, projectId } },
        create: { userId: user.id, projectId },
        update: {},
      });
    } else {
      await prisma.projectNotificationMute.deleteMany({
        where: { userId: user.id, projectId },
      });
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update notification settings." };
  }
}
