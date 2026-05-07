"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── toggleWatchIssue ─────────────────────────────────────────────────────────

/**
 * Toggle the current user's watch status on an issue.
 * Returns { watching: true } if now watching, { watching: false } if unwatched.
 */
export async function toggleWatchIssue(
  issueId: string,
): Promise<ActionResult<{ watching: boolean; watcherCount: number }>> {
  const user = await requireUser();

  try {
    const existing = await prisma.issueWatcher.findUnique({
      where: { issueId_userId: { issueId, userId: user.id } },
      select: { id: true },
    });

    if (existing) {
      await prisma.issueWatcher.delete({ where: { id: existing.id } });
    } else {
      await prisma.issueWatcher.create({ data: { issueId, userId: user.id } });
    }

    const watcherCount = await prisma.issueWatcher.count({ where: { issueId } });

    return { success: true, data: { watching: !existing, watcherCount } };
  } catch {
    return { success: false, error: "Failed to update watch status." };
  }
}

// ─── getWatchStatus ───────────────────────────────────────────────────────────

export async function getWatchStatus(
  issueId: string,
): Promise<ActionResult<{ watching: boolean; watcherCount: number }>> {
  const user = await requireUser();

  try {
    const [watcher, watcherCount] = await Promise.all([
      prisma.issueWatcher.findUnique({
        where: { issueId_userId: { issueId, userId: user.id } },
        select: { id: true },
      }),
      prisma.issueWatcher.count({ where: { issueId } }),
    ]);

    return { success: true, data: { watching: !!watcher, watcherCount } };
  } catch {
    return { success: false, error: "Failed to get watch status." };
  }
}
