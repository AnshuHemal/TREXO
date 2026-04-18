"use server";

import { prisma } from "@/lib/prisma";
import { parseMentionIds } from "@/lib/mentions";
import { broadcast } from "@/lib/sse";

// ─── Preference check ─────────────────────────────────────────────────────────

/**
 * Returns true if the user wants to receive this notification type.
 * Defaults to true if no preference record exists (opt-in by default).
 */
async function userWantsNotification(
  userId: string,
  type: string,
  issueId?: string,
): Promise<boolean> {
  try {
    // Check workspace-level preferences
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        assigned:      true,
        mentioned:     true,
        statusChanged: true,
        commentAdded:  true,
      },
    });

    if (prefs) {
      const wantsByType = (() => {
        switch (type) {
          case "assigned":       return prefs.assigned;
          case "mentioned":      return prefs.mentioned;
          case "status_changed": return prefs.statusChanged;
          case "comment_added":  return prefs.commentAdded;
          default:               return true;
        }
      })();
      if (!wantsByType) return false;
    }

    // Check per-project mute — if the issue belongs to a muted project, skip
    if (issueId) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { projectId: true },
      });
      if (issue) {
        const mute = await prisma.projectNotificationMute.findUnique({
          where: { userId_projectId: { userId, projectId: issue.projectId } },
          select: { id: true },
        });
        if (mute) return false; // project is muted
      }
    }

    return true;
  } catch {
    return true; // fail open — never silently drop notifications on DB error
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

  // Check user's notification preferences (workspace-level + project mute)
  const wantsIt = await userWantsNotification(userId, type, issueId);
  if (!wantsIt) return;

  try {
    await prisma.notification.create({
      data: { userId, actorId, type, issueId: issueId ?? null },
    });

    // Broadcast real-time notification event to the recipient
    // Fetch workspaceId via the issue's project
    if (issueId) {
      prisma.issue.findUnique({
        where: { id: issueId },
        select: { project: { select: { workspaceId: true } } },
      }).then((issue) => {
        if (!issue) return;
        broadcast({
          type: "notification.created",
          workspaceId: issue.project.workspaceId,
          actorId,
          data: { userId, type, issueId },
        });
      }).catch(() => {});
    }
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
