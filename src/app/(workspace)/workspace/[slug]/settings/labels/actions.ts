"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ─── createLabel ──────────────────────────────────────────────────────────────

export async function createLabel(
  workspaceId: string,
  data: { name: string; color: string },
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const name = data.name.trim();
  if (!name) return { success: false, fieldErrors: { name: "Label name is required." } };
  if (name.length > 32) return { success: false, fieldErrors: { name: "Name must be 32 characters or fewer." } };

  const color = data.color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { success: false, fieldErrors: { color: "Invalid hex color." } };
  }

  // Labels are global (not workspace-scoped in the schema), but we scope by
  // checking workspace membership. For v1 we create a shared label.
  try {
    const label = await prisma.label.create({
      data: { name, color },
      select: { id: true },
    });
    return { success: true, data: { id: label.id } };
  } catch {
    return { success: false, error: "Failed to create label." };
  }
}

// ─── updateLabel ──────────────────────────────────────────────────────────────

export async function updateLabel(
  labelId: string,
  data: { name: string; color: string },
): Promise<ActionResult> {
  await requireUser();

  const name = data.name.trim();
  if (!name) return { success: false, fieldErrors: { name: "Label name is required." } };
  if (name.length > 32) return { success: false, fieldErrors: { name: "Name must be 32 characters or fewer." } };

  const color = data.color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { success: false, fieldErrors: { color: "Invalid hex color." } };
  }

  try {
    await prisma.label.update({ where: { id: labelId }, data: { name, color } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update label." };
  }
}

// ─── deleteLabel ──────────────────────────────────────────────────────────────

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  await requireUser();

  try {
    // IssueLabel cascade handles removing from issues
    await prisma.label.delete({ where: { id: labelId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete label." };
  }
}

// ─── addLabelToIssue ──────────────────────────────────────────────────────────

export async function addLabelToIssue(
  issueId: string,
  labelId: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issueLabel.create({ data: { issueId, labelId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add label." };
  }
}

// ─── removeLabelFromIssue ─────────────────────────────────────────────────────

export async function removeLabelFromIssue(
  issueId: string,
  labelId: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issueLabel.delete({
      where: { issueId_labelId: { issueId, labelId } },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove label." };
  }
}
