"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ─── checkProjectKey ──────────────────────────────────────────────────────────

export async function checkProjectKey(
  workspaceId: string,
  key: string,
  excludeProjectId?: string,
): Promise<{ available: boolean }> {
  if (!key || key.length < 2) return { available: false };

  const existing = await prisma.project.findFirst({
    where: {
      workspaceId,
      key: key.toUpperCase(),
      ...(excludeProjectId ? { NOT: { id: excludeProjectId } } : {}),
    },
    select: { id: true },
  });

  return { available: !existing };
}

// ─── createProject ────────────────────────────────────────────────────────────

export async function createProject(
  workspaceId: string,
  data: { name: string; key: string; description?: string },
): Promise<ActionResult<{ id: string; key: string }>> {
  const user = await requireUser();

  // Permission check
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    return {
      success: false,
      error: "You don't have permission to create projects in this workspace.",
    };
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const fieldErrors: Record<string, string> = {};

  const name = data.name.trim();
  if (!name) fieldErrors.name = "Project name is required.";
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters.";
  else if (name.length > 64) fieldErrors.name = "Name must be 64 characters or fewer.";

  const key = data.key.trim().toUpperCase();
  if (!key) fieldErrors.key = "Project key is required.";
  else if (key.length < 2) fieldErrors.key = "Key must be at least 2 characters.";
  else if (key.length > 10) fieldErrors.key = "Key must be 10 characters or fewer.";
  else if (!/^[A-Z]+$/.test(key)) fieldErrors.key = "Key must contain only uppercase letters (A–Z).";

  const description = data.description?.trim() ?? undefined;
  if (description && description.length > 500) {
    fieldErrors.description = "Description must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // ── Key uniqueness ──────────────────────────────────────────────────────────
  const existing = await prisma.project.findFirst({
    where: { workspaceId, key },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      fieldErrors: { key: "This key is already in use. Try another." },
    };
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  try {
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        key,
        description: description ?? null,
      },
      select: { id: true, key: true },
    });

    return { success: true, data: { id: project.id, key: project.key } };
  } catch {
    return { success: false, error: "Failed to create project. Please try again." };
  }
}

// ─── updateProject ────────────────────────────────────────────────────────────

export async function updateProject(
  projectId: string,
  data: { name: string; key: string; description?: string },
): Promise<ActionResult> {
  const user = await requireUser();

  // Fetch project to get workspaceId
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    return { success: false, error: "Project not found." };
  }

  // Permission check
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    return {
      success: false,
      error: "You don't have permission to update this project.",
    };
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const fieldErrors: Record<string, string> = {};

  const name = data.name.trim();
  if (!name) fieldErrors.name = "Project name is required.";
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters.";
  else if (name.length > 64) fieldErrors.name = "Name must be 64 characters or fewer.";

  const key = data.key.trim().toUpperCase();
  if (!key) fieldErrors.key = "Project key is required.";
  else if (key.length < 2) fieldErrors.key = "Key must be at least 2 characters.";
  else if (key.length > 10) fieldErrors.key = "Key must be 10 characters or fewer.";
  else if (!/^[A-Z]+$/.test(key)) fieldErrors.key = "Key must contain only uppercase letters (A–Z).";

  const description = data.description?.trim() ?? undefined;
  if (description && description.length > 500) {
    fieldErrors.description = "Description must be 500 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // ── Key uniqueness (exclude current project) ────────────────────────────────
  const existing = await prisma.project.findFirst({
    where: {
      workspaceId: project.workspaceId,
      key,
      NOT: { id: projectId },
    },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      fieldErrors: { key: "This key is already in use. Try another." },
    };
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { name, key, description: description ?? null },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update project. Please try again." };
  }
}

// ─── deleteProject ────────────────────────────────────────────────────────────

export async function deleteProject(
  projectId: string,
  workspaceSlug: string,
): Promise<never> {
  const user = await requireUser();

  // Fetch project to get workspaceId
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  // Permission check — OWNER or ADMIN
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: project.workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("You don't have permission to delete this project.");
  }

  await prisma.project.delete({ where: { id: projectId } });

  redirect(`/workspace/${workspaceSlug}`);
}
