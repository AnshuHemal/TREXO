"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  assigned:      boolean;
  mentioned:     boolean;
  statusChanged: boolean;
  commentAdded:  boolean;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Default prefs ────────────────────────────────────────────────────────────

export const DEFAULT_PREFS: NotificationPrefs = {
  assigned:      true,
  mentioned:     true,
  statusChanged: true,
  commentAdded:  true,
};

// ─── getNotificationPrefs ─────────────────────────────────────────────────────

export async function getNotificationPrefs(): Promise<ActionResult<NotificationPrefs>> {
  const user = await requireUser();

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    // Return defaults if no record exists yet
    return {
      success: true,
      data: prefs
        ? {
            assigned:      prefs.assigned,
            mentioned:     prefs.mentioned,
            statusChanged: prefs.statusChanged,
            commentAdded:  prefs.commentAdded,
          }
        : DEFAULT_PREFS,
    };
  } catch {
    return { success: false, error: "Failed to load preferences." };
  }
}

// ─── saveNotificationPrefs ────────────────────────────────────────────────────

export async function saveNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId:        user.id,
        assigned:      prefs.assigned,
        mentioned:     prefs.mentioned,
        statusChanged: prefs.statusChanged,
        commentAdded:  prefs.commentAdded,
      },
      update: {
        assigned:      prefs.assigned,
        mentioned:     prefs.mentioned,
        statusChanged: prefs.statusChanged,
        commentAdded:  prefs.commentAdded,
      },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save preferences." };
  }
}
