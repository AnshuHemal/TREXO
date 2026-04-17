"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface TemplateInput {
  name: string;
  description?: string | null;
  type: string;
  priority: string;
  titlePrefix?: string | null;
}

export interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  type: string;
  priority: string;
  titlePrefix: string | null;
  createdAt: Date;
}

// ─── createTemplate ───────────────────────────────────────────────────────────

export async function createTemplate(
  workspaceId: string,
  input: TemplateInput,
): Promise<ActionResult<TemplateItem>> {
  await requireUser();

  const name = input.name.trim();
  if (!name) return { success: false, fieldErrors: { name: "Name is required." } };
  if (name.length > 64) return { success: false, fieldErrors: { name: "Name must be 64 characters or fewer." } };

  try {
    const template = await prisma.issueTemplate.create({
      data: {
        workspaceId,
        name,
        description: input.description?.trim() || null,
        type: input.type as never,
        priority: input.priority as never,
        titlePrefix: input.titlePrefix?.trim() || null,
      },
    });
    return { success: true, data: template };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { success: false, fieldErrors: { name: "A template with this name already exists." } };
    }
    return { success: false, error: "Failed to create template." };
  }
}

// ─── updateTemplate ───────────────────────────────────────────────────────────

export async function updateTemplate(
  templateId: string,
  input: TemplateInput,
): Promise<ActionResult> {
  await requireUser();

  const name = input.name.trim();
  if (!name) return { success: false, fieldErrors: { name: "Name is required." } };
  if (name.length > 64) return { success: false, fieldErrors: { name: "Name must be 64 characters or fewer." } };

  try {
    await prisma.issueTemplate.update({
      where: { id: templateId },
      data: {
        name,
        description: input.description?.trim() || null,
        type: input.type as never,
        priority: input.priority as never,
        titlePrefix: input.titlePrefix?.trim() || null,
      },
    });
    return { success: true };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { success: false, fieldErrors: { name: "A template with this name already exists." } };
    }
    return { success: false, error: "Failed to update template." };
  }
}

// ─── deleteTemplate ───────────────────────────────────────────────────────────

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  await requireUser();
  try {
    await prisma.issueTemplate.delete({ where: { id: templateId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete template." };
  }
}
