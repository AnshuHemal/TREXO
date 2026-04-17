"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  search?: string;
  sortKey?: string;
  groupBy?: string;
  dueDateFilter?: string;
  assigneeId?: string;
  priority?: string;
  status?: string;
}

export interface SavedFilterItem {
  id: string;
  name: string;
  filters: FilterState;
  isShared: boolean;
  userId: string;
  createdAt: Date;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── getSavedFilters ──────────────────────────────────────────────────────────

/**
 * Returns all saved filters for a project visible to the current user:
 * - Their own personal filters
 * - Shared filters from any workspace member
 */
export async function getSavedFilters(
  projectId: string,
): Promise<ActionResult<SavedFilterItem[]>> {
  const user = await requireUser();

  try {
    const filters = await prisma.savedFilter.findMany({
      where: {
        projectId,
        OR: [{ userId: user.id }, { isShared: true }],
      },
      orderBy: [{ isShared: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        filters: true,
        isShared: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: filters.map((f) => ({
        ...f,
        filters: f.filters as FilterState,
      })),
    };
  } catch {
    return { success: false, error: "Failed to load saved filters." };
  }
}

// ─── createSavedFilter ────────────────────────────────────────────────────────

export async function createSavedFilter(input: {
  workspaceId: string;
  projectId: string;
  name: string;
  filters: FilterState;
  isShared?: boolean;
}): Promise<ActionResult<SavedFilterItem>> {
  const user = await requireUser();

  const name = input.name.trim();
  if (!name) return { success: false, error: "Name is required." };
  if (name.length > 60) return { success: false, error: "Name must be 60 characters or fewer." };

  try {
    const existing = await prisma.savedFilter.findFirst({
      where: { projectId: input.projectId, userId: user.id, name },
    });
    if (existing) return { success: false, error: `A filter named "${name}" already exists.` };

    const filter = await prisma.savedFilter.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        userId: user.id,
        name,
        filters: input.filters as never,
        isShared: input.isShared ?? false,
      },
      select: {
        id: true,
        name: true,
        filters: true,
        isShared: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: { ...filter, filters: filter.filters as FilterState },
    };
  } catch {
    return { success: false, error: "Failed to save filter." };
  }
}

// ─── updateSavedFilter ────────────────────────────────────────────────────────

export async function updateSavedFilter(
  filterId: string,
  input: { name?: string; filters?: FilterState; isShared?: boolean },
): Promise<ActionResult<SavedFilterItem>> {
  const user = await requireUser();

  try {
    const existing = await prisma.savedFilter.findFirst({
      where: { id: filterId, userId: user.id },
    });
    if (!existing) return { success: false, error: "Filter not found." };

    if (input.name) {
      const name = input.name.trim();
      if (name.length > 60) return { success: false, error: "Name must be 60 characters or fewer." };
      const duplicate = await prisma.savedFilter.findFirst({
        where: { projectId: existing.projectId, userId: user.id, name, id: { not: filterId } },
      });
      if (duplicate) return { success: false, error: `A filter named "${name}" already exists.` };
    }

    const updated = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        ...(input.name    !== undefined && { name:     input.name.trim() }),
        ...(input.filters !== undefined && { filters:  input.filters as never }),
        ...(input.isShared !== undefined && { isShared: input.isShared }),
      },
      select: {
        id: true,
        name: true,
        filters: true,
        isShared: true,
        userId: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: { ...updated, filters: updated.filters as FilterState },
    };
  } catch {
    return { success: false, error: "Failed to update filter." };
  }
}

// ─── deleteSavedFilter ────────────────────────────────────────────────────────

export async function deleteSavedFilter(
  filterId: string,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    const existing = await prisma.savedFilter.findFirst({
      where: { id: filterId, userId: user.id },
    });
    if (!existing) return { success: false, error: "Filter not found." };

    await prisma.savedFilter.delete({ where: { id: filterId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete filter." };
  }
}
