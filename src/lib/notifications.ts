"use server";

import { prisma } from "@/lib/prisma";
import { parseMentionIds } from "@/lib/mentions";

// ─── prefKey ──────────────────────────────────────────────────────────────────

/** Maps a notification type string to the corresponding preference column. */
function prefKey(
  type: string,
): "assigned" | "mentioned" | "statusChanged" | "commentAdded" | null {
  switch (type) {
    case "assigned":       return "assigned";
    case "mentioned":      return "mentioned";
    case "status_changed": return "statusChanged";
    case "comment_added":  return "commentAdded";
    default:               return null;
  }
}

// ─── createNotification ───────────────────────────────────────────────────────

export async function createNotification({
  userId,
  actorId,
  type,
  issueId,
}: {
  userId: string;
  actorId: string;
  type: string;
  issueId?: string;
}): Promise<void> {
  // Never notify yourself
  if (userId === actorId) return;

  // Check user's notification preferences
  const col = prefKey(type);
  if (col) {
    try {
      const pref = await prisma.notificationPreference.findUnique({
        where: { userId },
        select: { [col]: true },
      });
      // If a preference record exists and the toggle is off, skip
      if (pref && pref[col] === false) return;
    } catch {
      // If pref check fails, fall through and create the notification anyway
    }
  }

  try {
    await prisma.notification.create({
      data: { userId, actorId, type, issueId: issueId ?? null },
    });
  } catch {
    // Non-critical — swallow silently
  }
}

// ─── notifyAssigned ───────────────────────────────────────────────────────────

/**
 * Notify a user that they were assigned to an issue.
 */
export async function notifyAssigned({
  assigneeId,
  actorId,
  issueId,
}: {
  assigneeId: string;
  actorId: string;
  issueId: string;
}): Promise<void> {
  await createNotification({ userId: assigneeId, actorId, type: "assigned", issueId });
}

// ─── notifyStatusChanged ──────────────────────────────────────────────────────

/**
 * Notify the issue reporter that the status changed.
 */
export async function notifyStatusChanged({
  reporterId,
  actorId,
  issueId,
}: {
  reporterId: string;
  actorId: string;
  issueId: string;
}): Promise<void> {
  await createNotification({ userId: reporterId, actorId, type: "status_changed", issueId });
}

// ─── notifyCommentAdded ───────────────────────────────────────────────────────

/**
 * Notify the issue reporter + all unique previous commenters that a new
 * comment was added. Deduplicates recipients and excludes the actor.
 */
export async function notifyCommentAdded({
  issueId,
  actorId,
}: {
  issueId: string;
  actorId: string;
}): Promise<void> {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        reporterId: true,
        comments: {
          select: { authorId: true },
          distinct: ["authorId"],
        },
      },
    });

    if (!issue) return;

    // Collect unique recipients: reporter + all commenters
    const recipients = new Set<string>([issue.reporterId]);
    for (const c of issue.comments) recipients.add(c.authorId);
    recipients.delete(actorId); // never notify yourself

    await Promise.all(
      Array.from(recipients).map((userId) =>
        createNotification({ userId, actorId, type: "comment_added", issueId }),
      ),
    );
  } catch {
    // Non-critical
  }
}

// ─── notifyMentioned ──────────────────────────────────────────────────────────

/**
 * Notify all users mentioned in a comment body (parsed from HTML).
 * Deduplicates recipients and excludes the actor.
 */
export async function notifyMentioned({
  html,
  actorId,
  issueId,
}: {
  html: string;
  actorId: string;
  issueId: string;
}): Promise<void> {
  const mentionedIds = parseMentionIds(html);
  if (mentionedIds.length === 0) return;

  await Promise.all(
    mentionedIds.map((userId) =>
      createNotification({ userId, actorId, type: "mentioned", issueId }),
    ),
  );
}
