"use client";

import { useCallback } from "react";
import { useRealtime } from "./use-realtime";
import type { RealtimeEvent } from "@/lib/sse";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealtimeIssueUpdate {
  id: string;
  key?: number;
  title?: string;
  status?: string;
  priority?: string;
  type?: string;
  position?: number;
  assigneeId?: string | null;
  projectId?: string;
  changedFields?: string[];
}

interface UseRealtimeIssuesOptions {
  workspaceId: string | undefined;
  projectId: string;
  currentUserId: string;
  onIssueCreated?: (issue: RealtimeIssueUpdate) => void;
  onIssueUpdated?: (issue: RealtimeIssueUpdate) => void;
  onIssueMoved?: (issue: RealtimeIssueUpdate & { newStatus: string; newPosition: number }) => void;
  onIssueDeleted?: (issueId: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

/**
 * useRealtimeIssues — subscribes to issue mutations for a specific project.
 *
 * Filters events to only those matching the current projectId.
 * Ignores events triggered by the current user (they already have optimistic updates).
 */
export function useRealtimeIssues({
  workspaceId,
  projectId,
  currentUserId,
  onIssueCreated,
  onIssueUpdated,
  onIssueMoved,
  onIssueDeleted,
  onConnected,
  onDisconnected,
}: UseRealtimeIssuesOptions): void {
  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      // Only process events for this project
      if (event.projectId && event.projectId !== projectId) return;

      // Skip events triggered by the current user
      // (they already have optimistic updates applied)
      if (event.actorId === currentUserId) return;

      const data = event.data as unknown as RealtimeIssueUpdate & {
        newStatus?: string;
        newPosition?: number;
      };

      switch (event.type) {
        case "issue.created":
          onIssueCreated?.(data);
          break;

        case "issue.updated":
          onIssueUpdated?.(data);
          break;

        case "issue.moved":
          onIssueMoved?.({
            ...data,
            newStatus:   data.newStatus   ?? data.status ?? "",
            newPosition: data.newPosition ?? data.position ?? 0,
          });
          break;

        case "issue.deleted":
          if (data.id) onIssueDeleted?.(data.id);
          break;
      }
    },
    [projectId, currentUserId, onIssueCreated, onIssueUpdated, onIssueMoved, onIssueDeleted],
  );

  useRealtime({
    workspaceId,
    filter: ["issue.created", "issue.updated", "issue.moved", "issue.deleted"],
    onEvent: handleEvent,
    onConnected,
    onDisconnected,
    enabled: !!workspaceId,
  });
}
