/**
 * Broadcast helpers for server actions.
 *
 * Each helper fetches the minimal context needed (workspaceId, projectId)
 * and calls broadcast() from the SSE bus.
 *
 * All helpers are fire-and-forget — they never throw.
 * Import only in "use server" files.
 */

import { broadcast } from "@/lib/sse";
import { prisma } from "@/lib/prisma";
import type { RealtimeEventType } from "@/lib/sse";

// ─── Issue broadcasts ─────────────────────────────────────────────────────────

/**
 * Broadcast an issue mutation event.
 * Fetches workspaceId from the project relation.
 */
export async function broadcastIssueEvent(
  type: RealtimeEventType,
  issueId: string,
  actorId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        position: true,
        assigneeId: true,
        projectId: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!issue) return;

    broadcast({
      type,
      workspaceId: issue.project.workspaceId,
      projectId: issue.projectId,
      actorId,
      data: {
        id:         issue.id,
        key:        issue.key,
        title:      issue.title,
        status:     issue.status,
        priority:   issue.priority,
        type:       issue.type,
        position:   issue.position,
        assigneeId: issue.assigneeId,
        projectId:  issue.projectId,
        ...extra,
      },
    });
  } catch {
    // Never throw from broadcast helpers
  }
}

/**
 * Broadcast an issue.deleted event.
 * Needs projectId + workspaceId before the record is gone.
 */
export async function broadcastIssueDeleted(
  issueId: string,
  projectId: string,
  workspaceId: string,
  actorId: string,
): Promise<void> {
  try {
    broadcast({
      type: "issue.deleted",
      workspaceId,
      projectId,
      actorId,
      data: { id: issueId, projectId },
    });
  } catch {
    // noop
  }
}

// ─── Comment broadcasts ───────────────────────────────────────────────────────

export async function broadcastCommentEvent(
  type: RealtimeEventType,
  commentId: string,
  issueId: string,
  actorId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: { projectId: true, project: { select: { workspaceId: true } } },
    });

    if (!issue) return;

    broadcast({
      type,
      workspaceId: issue.project.workspaceId,
      projectId: issue.projectId,
      actorId,
      data: { id: commentId, issueId, ...extra },
    });
  } catch {
    // noop
  }
}

// ─── Sprint broadcasts ────────────────────────────────────────────────────────

export async function broadcastSprintEvent(
  type: RealtimeEventType,
  sprintId: string,
  actorId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      select: {
        id: true,
        name: true,
        status: true,
        projectId: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!sprint) return;

    broadcast({
      type,
      workspaceId: sprint.project.workspaceId,
      projectId: sprint.projectId,
      actorId,
      data: {
        id:        sprint.id,
        name:      sprint.name,
        status:    sprint.status,
        projectId: sprint.projectId,
        ...extra,
      },
    });
  } catch {
    // noop
  }
}

// ─── Notification broadcasts ──────────────────────────────────────────────────

export async function broadcastNotification(
  userId: string,
  workspaceId: string,
  notificationData: Record<string, unknown>,
): Promise<void> {
  try {
    broadcast({
      type: "notification.created",
      workspaceId,
      actorId: (notificationData.actorId as string) ?? "",
      data: { ...notificationData, userId },
    });
  } catch {
    // noop
  }
}

// ─── Member broadcasts ────────────────────────────────────────────────────────

export async function broadcastMemberEvent(
  type: RealtimeEventType,
  workspaceId: string,
  actorId: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    broadcast({ type, workspaceId, actorId, data });
  } catch {
    // noop
  }
}
