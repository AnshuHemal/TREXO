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

export interface TimeLogItem {
  id: string;
  minutes: number;
  loggedAt: Date;
  description: string | null;
  user: { id: string; name: string; image: string | null };
}

export interface LogTimeInput {
  issueId: string;
  minutes: number;
  loggedAt?: Date;
  description?: string | null;
}

// ─── logTime ─────────────────────────────────────────────────────────────────

export async function logTime(
  input: LogTimeInput,
): Promise<ActionResult<TimeLogItem>> {
  const user = await requireUser();

  if (!input.minutes || input.minutes <= 0) {
    return { success: false, fieldErrors: { minutes: "Duration must be greater than 0." } };
  }
  if (input.minutes > 60 * 24 * 7) {
    return { success: false, fieldErrors: { minutes: "Duration cannot exceed 1 week (10,080 minutes)." } };
  }

  try {
    const log = await prisma.timeLog.create({
      data: {
        issueId:     input.issueId,
        userId:      user.id,
        minutes:     input.minutes,
        loggedAt:    input.loggedAt ?? new Date(),
        description: input.description?.trim() || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return { success: true, data: log };
  } catch {
    return { success: false, error: "Failed to log time. Please try again." };
  }
}

// ─── updateTimeLog ────────────────────────────────────────────────────────────

export async function updateTimeLog(
  logId: string,
  input: { minutes?: number; loggedAt?: Date; description?: string | null },
): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await prisma.timeLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  });

  if (!existing) return { success: false, error: "Time log not found." };
  if (existing.userId !== user.id) {
    return { success: false, error: "You can only edit your own time logs." };
  }

  if (input.minutes !== undefined && input.minutes <= 0) {
    return { success: false, fieldErrors: { minutes: "Duration must be greater than 0." } };
  }

  try {
    await prisma.timeLog.update({
      where: { id: logId },
      data: {
        ...(input.minutes    !== undefined && { minutes:     input.minutes }),
        ...(input.loggedAt   !== undefined && { loggedAt:    input.loggedAt }),
        ...(input.description !== undefined && { description: input.description?.trim() || null }),
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update time log." };
  }
}

// ─── deleteTimeLog ────────────────────────────────────────────────────────────

export async function deleteTimeLog(logId: string): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await prisma.timeLog.findUnique({
    where: { id: logId },
    select: { userId: true },
  });

  if (!existing) return { success: false, error: "Time log not found." };
  if (existing.userId !== user.id) {
    return { success: false, error: "You can only delete your own time logs." };
  }

  try {
    await prisma.timeLog.delete({ where: { id: logId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete time log." };
  }
}

// ─── getTimeLogsForIssue ──────────────────────────────────────────────────────

export async function getTimeLogsForIssue(
  issueId: string,
): Promise<ActionResult<TimeLogItem[]>> {
  await requireUser();

  try {
    const logs = await prisma.timeLog.findMany({
      where: { issueId },
      orderBy: { loggedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });
    return { success: true, data: logs };
  } catch {
    return { success: false, error: "Failed to fetch time logs." };
  }
}
