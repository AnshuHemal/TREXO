"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";
import type { CustomFieldsConfig, CustomFieldValues } from "@/lib/custom-fields";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── saveCustomFieldsConfig ───────────────────────────────────────────────────

/**
 * Save the custom field definitions for a project.
 * Only OWNER or ADMIN can call this.
 */
export async function saveCustomFieldsConfig(
  projectId: string,
  config: CustomFieldsConfig,
): Promise<ActionResult> {
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
    return { success: false, error: "Only admins can manage custom fields." };
  }

  // Validate
  for (const field of config.fields) {
    if (!field.name.trim()) return { success: false, error: "Field name cannot be empty." };
    if (field.name.length > 64) return { success: false, error: `Field name "${field.name}" is too long.` };
    if (field.type === "dropdown" && (!field.options || field.options.length === 0)) {
      return { success: false, error: `Dropdown field "${field.name}" needs at least one option.` };
    }
  }

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { customFieldsConfig: config as unknown as Prisma.InputJsonValue },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save custom fields." };
  }
}

// ─── updateIssueCustomFields ──────────────────────────────────────────────────

/**
 * Update the custom field values for a single issue.
 */
export async function updateIssueCustomFields(
  issueId: string,
  values: CustomFieldValues,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issue.update({
      where: { id: issueId },
      data: { customFields: values as unknown as Prisma.InputJsonValue },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update custom fields." };
  }
}
