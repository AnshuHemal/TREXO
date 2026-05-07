"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function checkWorkspaceSlug(
  slug: string,
): Promise<{ available: boolean }> {
  if (!slug || slug.length < 2) return { available: false };
  const existing = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });
  return { available: !existing };
}

export async function updateWorkspaceLogo(
  workspaceId: string,
  logo: string | null,
): Promise<ActionResult> {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
    select: { id: true },
  });

  if (!membership) {
    return { success: false, error: "You don't have permission to update this workspace." };
  }

  if (logo && logo.length > 3 * 1024 * 1024) {
    return { success: false, error: "Logo image must be smaller than 2 MB." };
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { logo },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update workspace logo." };
  }
}

export async function updateWorkspace(
  workspaceId: string,
  data: { name: string; slug: string },
): Promise<ActionResult> {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { id: true },
  });

  if (!membership) {
    return { success: false, error: "You don't have permission to update this workspace." };
  }

  const fieldErrors: Record<string, string> = {};

  const name = data.name.trim();
  if (!name) fieldErrors.name = "Workspace name is required.";
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters.";
  else if (name.length > 64) fieldErrors.name = "Name must be 64 characters or fewer.";

  const slug = data.slug.trim().toLowerCase();
  if (!slug) fieldErrors.slug = "URL slug is required.";
  else if (!/^[a-z0-9-]+$/.test(slug)) fieldErrors.slug = "Only lowercase letters, numbers, and hyphens.";
  else if (slug.length < 2) fieldErrors.slug = "Slug must be at least 2 characters.";
  else if (slug.length > 48) fieldErrors.slug = "Slug must be 48 characters or fewer.";
  else if (slug.startsWith("-") || slug.endsWith("-")) fieldErrors.slug = "Slug cannot start or end with a hyphen.";

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  const existing = await prisma.workspace.findFirst({
    where: { slug, NOT: { id: workspaceId } },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      fieldErrors: { slug: "This URL is already taken. Try another." },
    };
  }

  try {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name, slug },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update workspace. Please try again." };
  }
}

export async function deleteWorkspace(workspaceId: string): Promise<never> {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: user.id,
      role: "OWNER",
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("Only the workspace owner can delete this workspace.");
  }

  await prisma.workspace.delete({ where: { id: workspaceId } });

  redirect("/onboarding");
}
