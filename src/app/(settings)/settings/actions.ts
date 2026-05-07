"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface NotificationPrefs {
  assigned: boolean;
  mentioned: boolean;
  statusChanged: boolean;
  commentAdded: boolean;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getNotificationPrefs(): Promise<ActionResult<NotificationPrefs>> {
  const user = await requireUser();

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });

    return {
      success: true,
      data: {
        assigned:      prefs?.assigned      ?? true,
        mentioned:     prefs?.mentioned     ?? true,
        statusChanged: prefs?.statusChanged ?? true,
        commentAdded:  prefs?.commentAdded  ?? true,
      },
    };
  } catch {
    return { success: false, error: "Failed to load preferences." };
  }
}

export async function saveNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<ActionResult> {
  const user = await requireUser();

  try {
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...prefs },
      update: prefs,
    });

    return { success: true };
  } catch {
    return { success: false, error: "Failed to save preferences." };
  }
}
