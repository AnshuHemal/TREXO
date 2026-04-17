"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import {
  notifyAssigned,
  notifyStatusChanged,
  notifyCommentAdded,
} from "@/lib/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export type IssueType     = "EPIC" | "STORY" | "TASK" | "BUG" | "SUBTASK";
export type IssueStatus   = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type IssuePriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW" | "NO_PRIORITY";

export interface CreateIssueInput {
  projectId: string;
  title: string;
  type?: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string | null;
  description?: string | null;
}

export interface UpdateIssueInput {
  title?: string;
  type?: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string | null;
  description?: string | null;
  dueDate?: Date | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Gets the next issue key for a project (auto-increment per project).
 * Uses a transaction to prevent race conditions.
 */
async function getNextIssueKey(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  projectId: string,
): Promise<number> {
  const last = await tx.issue.findFirst({
    where: { projectId },
    orderBy: { key: "desc" },
    select: { key: true },
  });
  return (last?.key ?? 0) + 1;
}

// ─── createIssue ─────────────────────────────────────────────────────────────

export async function createIssue(
  input: CreateIssueInput,
): Promise<ActionResult<{ id: string; key: number }>> {
  const user = await requireUser();

  const title = input.title.trim();
  if (!title) return { success: false, fieldErrors: { title: "Title is required." } };
  if (title.length > 255) return { success: false, fieldErrors: { title: "Title must be 255 characters or fewer." } };

  try {
    const issue = await prisma.$transaction(async (tx) => {
      const key = await getNextIssueKey(tx, input.projectId);

      // Get max position for ordering
      const lastIssue = await tx.issue.findFirst({
        where: { projectId: input.projectId, status: input.status ?? "BACKLOG" },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const position = (lastIssue?.position ?? 0) + 1000;

      return tx.issue.create({
        data: {
          projectId: input.projectId,
          reporterId: user.id,
          key,
          title,
          type: input.type ?? "TASK",
          status: input.status ?? "BACKLOG",
          priority: input.priority ?? "MEDIUM",
          assigneeId: input.assigneeId ?? null,
          description: input.description ?? null,
          position,
        },
        select: { id: true, key: true },
      });
    });

    // Log activity
    await prisma.activity.create({
      data: {
        issueId: issue.id,
        actorId: user.id,
        type: "issue_created",
      },
    }).catch(() => {}); // non-critical

    // Notify assignee if set
    if (input.assigneeId) {
      notifyAssigned({
        assigneeId: input.assigneeId,
        actorId: user.id,
        issueId: issue.id,
      }).catch(() => {});
    }

    return { success: true, data: { id: issue.id, key: issue.key } };
  } catch {
    return { success: false, error: "Failed to create issue. Please try again." };
  }
}

// ─── updateIssue ─────────────────────────────────────────────────────────────

export async function updateIssue(
  issueId: string,
  input: UpdateIssueInput,
): Promise<ActionResult> {
  const user = await requireUser();

  const existing = await prisma.issue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      assigneeId: true,
      type: true,
    },
  });

  if (!existing) return { success: false, error: "Issue not found." };

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { success: false, fieldErrors: { title: "Title is required." } };
    if (title.length > 255) return { success: false, fieldErrors: { title: "Title must be 255 characters or fewer." } };
  }

  try {
    await prisma.issue.update({
      where: { id: issueId },
      data: {
        ...(input.title !== undefined && { title: input.title.trim() }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.priority !== undefined && { priority: input.priority }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      },
    });

    // Log field-change activities
    const activities: Array<{ type: string; fromValue?: string; toValue?: string }> = [];

    if (input.status !== undefined && input.status !== existing.status) {
      activities.push({ type: "status_changed", fromValue: existing.status, toValue: input.status });
    }
    if (input.priority !== undefined && input.priority !== existing.priority) {
      activities.push({ type: "priority_changed", fromValue: existing.priority, toValue: input.priority });
    }
    if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
      activities.push({ type: "assignee_changed", fromValue: existing.assigneeId ?? undefined, toValue: input.assigneeId ?? undefined });
    }

    if (activities.length > 0) {
      await prisma.activity.createMany({
        data: activities.map((a) => ({ issueId, actorId: user.id, ...a })),
      }).catch(() => {});
    }

    // ── Notifications ──────────────────────────────────────────────────────────

    // Notify new assignee
    if (
      input.assigneeId !== undefined &&
      input.assigneeId !== existing.assigneeId &&
      input.assigneeId
    ) {
      notifyAssigned({
        assigneeId: input.assigneeId,
        actorId: user.id,
        issueId,
      }).catch(() => {});
    }

    // Notify reporter on status change (fetch reporter only if needed)
    if (input.status !== undefined && input.status !== existing.status) {
      prisma.issue.findUnique({ where: { id: issueId }, select: { reporterId: true } })
        .then((issue) => {
          if (issue) {
            notifyStatusChanged({
              reporterId: issue.reporterId,
              actorId: user.id,
              issueId,
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update issue. Please try again." };
  }
}

// ─── deleteIssue ─────────────────────────────────────────────────────────────

export async function deleteIssue(issueId: string): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issue.delete({ where: { id: issueId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete issue. Please try again." };
  }
}

// ─── addComment ──────────────────────────────────────────────────────────────

export async function addComment(
  issueId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  if (!body.trim()) return { success: false, error: "Comment cannot be empty." };

  try {
    const comment = await prisma.comment.create({
      data: { issueId, authorId: user.id, body },
      select: { id: true },
    });

    await prisma.activity.create({
      data: { issueId, actorId: user.id, type: "comment_added" },
    }).catch(() => {});

    // Notify reporter + previous commenters
    notifyCommentAdded({ issueId, actorId: user.id }).catch(() => {});

    return { success: true, data: { id: comment.id } };
  } catch {
    return { success: false, error: "Failed to add comment." };
  }
}

// ─── deleteComment ────────────────────────────────────────────────────────────

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await requireUser();

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) return { success: false, error: "Comment not found." };
  if (comment.authorId !== user.id) return { success: false, error: "You can only delete your own comments." };

  try {
    await prisma.comment.delete({ where: { id: commentId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete comment." };
  }
}

// ─── moveIssue ────────────────────────────────────────────────────────────────

const POSITION_GAP     = 1000;   // initial spacing between issues
const REBALANCE_THRESHOLD = 0.001; // rebalance when gap drops below this

/**
 * Moves an issue to a new status column and/or position.
 *
 * Position algorithm (midpoint):
 *   - Dragged between two issues: newPos = (above.position + below.position) / 2
 *   - Dragged to top of column:   newPos = firstIssue.position - POSITION_GAP
 *   - Dragged to bottom:          newPos = lastIssue.position  + POSITION_GAP
 *
 * When the gap between adjacent positions drops below REBALANCE_THRESHOLD,
 * all issues in the column are rebalanced with POSITION_GAP spacing.
 */
export async function moveIssue(
  issueId: string,
  newStatus: IssueStatus,
  newPosition: number,
): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issue.update({
      where: { id: issueId },
      data: { status: newStatus, position: newPosition },
    });

    // Check if rebalance is needed for this column
    const columnIssues = await prisma.issue.findMany({
      where: {
        projectId: (await prisma.issue.findUnique({ where: { id: issueId }, select: { projectId: true } }))!.projectId,
        status: newStatus,
      },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

    // Find minimum gap between adjacent issues
    let needsRebalance = false;
    for (let i = 1; i < columnIssues.length; i++) {
      if (columnIssues[i].position - columnIssues[i - 1].position < REBALANCE_THRESHOLD) {
        needsRebalance = true;
        break;
      }
    }

    if (needsRebalance) {
      // Rebalance: assign evenly spaced positions
      await prisma.$transaction(
        columnIssues.map((issue, index) =>
          prisma.issue.update({
            where: { id: issue.id },
            data: { position: (index + 1) * POSITION_GAP },
          }),
        ),
      );
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to move issue." };
  }
}

// ─── editComment ──────────────────────────────────────────────────────────────

export async function editComment(
  commentId: string,
  body: string,
): Promise<ActionResult> {
  const user = await requireUser();

  if (!body.trim()) return { success: false, error: "Comment cannot be empty." };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) return { success: false, error: "Comment not found." };
  if (comment.authorId !== user.id) {
    return { success: false, error: "You can only edit your own comments." };
  }

  try {
    await prisma.comment.update({
      where: { id: commentId },
      data: { body },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to edit comment." };
  }
}

// ─── Label actions ────────────────────────────────────────────────────────────

export async function addLabelToIssue(
  issueId: string,
  labelId: string,
): Promise<ActionResult> {
  await requireUser();
  try {
    await prisma.issueLabel.create({ data: { issueId, labelId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to add label." };
  }
}

export async function removeLabelFromIssue(
  issueId: string,
  labelId: string,
): Promise<ActionResult> {
  await requireUser();
  try {
    await prisma.issueLabel.delete({
      where: { issueId_labelId: { issueId, labelId } },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove label." };
  }
}
