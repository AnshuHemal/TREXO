"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { WorkflowConfig } from "@/lib/workflow";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Save the workflow config for a project.
 * Only OWNER or ADMIN can call this.
 */
export async function saveWorkflowConfig(
  projectId: string,
  config: WorkflowConfig,
): Promise<ActionResult> {
  const user = await requireUser();

  // Verify the user is OWNER or ADMIN in the project's workspace
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) return { success: false, error: "Project not found." };

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    return { success: false, error: "You don't have permission to edit workflow settings." };
  }

  // Validate: must have at least 2 enabled statuses
  const enabledCount = config.statuses.filter((s) => s.enabled).length;
  if (enabledCount < 2) {
    return { success: false, error: "At least 2 statuses must be enabled." };
  }

  // Validate: DONE and CANCELLED must always be present (they're used for completion logic)
  const hasDone      = config.statuses.some((s) => s.value === "DONE");
  const hasCancelled = config.statuses.some((s) => s.value === "CANCELLED");
  if (!hasDone || !hasCancelled) {
    return { success: false, error: "DONE and CANCELLED statuses are required." };
  }

  // Validate label lengths
  for (const s of config.statuses) {
    if (!s.label.trim()) return { success: false, error: `Status label cannot be empty.` };
    if (s.label.length > 32) return { success: false, error: `Status label "${s.label}" is too long (max 32 chars).` };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { workflowConfig: config as never },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save workflow settings." };
  }
}

/**
 * Reset the workflow config to defaults (null = use global defaults).
 */
export async function resetWorkflowConfig(projectId: string): Promise<ActionResult> {
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) return { success: false, error: "Project not found." };

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    return { success: false, error: "You don't have permission to reset workflow settings." };
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { workflowConfig: null },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to reset workflow settings." };
  }
}
