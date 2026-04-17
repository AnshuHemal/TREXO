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

export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export interface CreateSprintInput {
  projectId: string;
  name: string;
  goal?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string;
  startDate?: Date | null;
  endDate?: Date | null;
}

// ─── createSprint ─────────────────────────────────────────────────────────────

export async function createSprint(
  input: CreateSprintInput,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const name = input.name.trim();
  if (!name) return { success: false, fieldErrors: { name: "Sprint name is required." } };
  if (name.length > 64) return { success: false, fieldErrors: { name: "Name must be 64 characters or fewer." } };

  try {
    const sprint = await prisma.sprint.create({
      data: {
        projectId: input.projectId,
        name,
        goal: input.goal?.trim() || null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: "PLANNED",
      },
      select: { id: true },
    });

    return { success: true, data: { id: sprint.id } };
  } catch {
    return { success: false, error: "Failed to create sprint. Please try again." };
  }
}

// ─── updateSprint ─────────────────────────────────────────────────────────────

export async function updateSprint(
  sprintId: string,
  input: UpdateSprintInput,
): Promise<ActionResult> {
  await requireUser();

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { success: false, fieldErrors: { name: "Sprint name is required." } };
    if (name.length > 64) return { success: false, fieldErrors: { name: "Name must be 64 characters or fewer." } };
  }

  try {
    await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.goal !== undefined && { goal: input.goal?.trim() || null }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.endDate !== undefined && { endDate: input.endDate }),
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update sprint. Please try again." };
  }
}

// ─── deleteSprint ─────────────────────────────────────────────────────────────

export async function deleteSprint(sprintId: string): Promise<ActionResult> {
  await requireUser();

  try {
    // Unassign all issues from this sprint before deleting
    await prisma.issue.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    });

    await prisma.sprint.delete({ where: { id: sprintId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete sprint. Please try again." };
  }
}

// ─── startSprint ──────────────────────────────────────────────────────────────

export async function startSprint(sprintId: string): Promise<ActionResult> {
  await requireUser();

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { id: true, projectId: true, status: true },
  });

  if (!sprint) return { success: false, error: "Sprint not found." };
  if (sprint.status !== "PLANNED") return { success: false, error: "Only planned sprints can be started." };

  // Enforce: only one active sprint per project
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: sprint.projectId, status: "ACTIVE" },
    select: { id: true },
  });

  if (activeSprint) {
    return { success: false, error: "Another sprint is already active. Complete it before starting a new one." };
  }

  try {
    await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        status: "ACTIVE",
        startDate: new Date(),
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to start sprint. Please try again." };
  }
}

// ─── completeSprint ───────────────────────────────────────────────────────────

export type IncompleteIssueAction = "backlog" | "next_sprint";

export interface CompleteSprintInput {
  sprintId: string;
  /** Where to move incomplete issues: "backlog" or a sprint ID */
  incompleteAction: IncompleteIssueAction;
  /** Target sprint ID when incompleteAction === "next_sprint" */
  targetSprintId?: string;
}

export async function completeSprint(
  input: CompleteSprintInput,
): Promise<ActionResult> {
  await requireUser();

  const sprint = await prisma.sprint.findUnique({
    where: { id: input.sprintId },
    select: { id: true, projectId: true, status: true },
  });

  if (!sprint) return { success: false, error: "Sprint not found." };
  if (sprint.status !== "ACTIVE") return { success: false, error: "Only active sprints can be completed." };

  try {
    await prisma.$transaction(async (tx) => {
      // Find incomplete issues in this sprint
      const incompleteIssues = await tx.issue.findMany({
        where: {
          sprintId: input.sprintId,
          status: { notIn: ["DONE", "CANCELLED"] },
        },
        select: { id: true },
      });

      if (incompleteIssues.length > 0) {
        const ids = incompleteIssues.map((i) => i.id);

        if (input.incompleteAction === "backlog") {
          // Move to backlog — unassign from sprint, set status to BACKLOG
          await tx.issue.updateMany({
            where: { id: { in: ids } },
            data: { sprintId: null, status: "BACKLOG" },
          });
        } else if (input.incompleteAction === "next_sprint" && input.targetSprintId) {
          // Move to another sprint
          await tx.issue.updateMany({
            where: { id: { in: ids } },
            data: { sprintId: input.targetSprintId },
          });
        }
      }

      // Mark sprint as completed
      await tx.sprint.update({
        where: { id: input.sprintId },
        data: { status: "COMPLETED", endDate: new Date() },
      });
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to complete sprint. Please try again." };
  }
}

// ─── addIssueToSprint ─────────────────────────────────────────────────────────

export async function addIssueToSprint(
  issueId: string,
  sprintId: string,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issue.update({
      where: { id: issueId },
      data: { sprintId },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add issue to sprint." };
  }
}

// ─── removeIssueFromSprint ────────────────────────────────────────────────────

export async function removeIssueFromSprint(issueId: string): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issue.update({
      where: { id: issueId },
      data: { sprintId: null },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove issue from sprint." };
  }
}

// ─── updateSprintDates (roadmap drag) ─────────────────────────────────────────

export async function updateSprintDates(
  sprintId: string,
  startDate: Date,
  endDate: Date,
): Promise<ActionResult> {
  await requireUser();

  if (startDate >= endDate) {
    return { success: false, error: "Start date must be before end date." };
  }

  try {
    await prisma.sprint.update({
      where: { id: sprintId },
      data: { startDate, endDate },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update sprint dates." };
  }
}
