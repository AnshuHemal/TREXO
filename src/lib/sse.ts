/**
 * In-process SSE event bus.
 *
 * Architecture:
 *   - Each connected client registers a controller keyed by workspaceId.
 *   - Server actions call `broadcast()` after mutations.
 *   - The SSE route streams events to all subscribers of that workspace.
 *
 * Why in-process?
 *   - Zero extra infrastructure (no Redis, no Pusher).
 *   - Works perfectly for single-server deployments (dev + small prod).
 *   - For multi-instance deployments, swap the Map for a Redis pub/sub adapter.
 *
 * Event scoping:
 *   - workspace:{id}  — all members of a workspace receive these
 *   - project:{id}    — only members viewing that project receive these
 *   Clients subscribe to both their workspace channel and the current project channel.
 */

// ─── Event types ──────────────────────────────────────────────────────────────

export type RealtimeEventType =
  // Issues
  | "issue.created"
  | "issue.updated"
  | "issue.deleted"
  | "issue.moved"
  // Comments
  | "comment.added"
  | "comment.edited"
  | "comment.deleted"
  // Sprints
  | "sprint.created"
  | "sprint.updated"
  | "sprint.started"
  | "sprint.completed"
  | "sprint.deleted"
  // Members
  | "member.added"
  | "member.removed"
  | "member.role_changed"
  // Notifications
  | "notification.created"
  // Heartbeat
  | "ping";

export interface RealtimeEvent {
  type: RealtimeEventType;
  /** Workspace the event belongs to */
  workspaceId: string;
  /** Project the event belongs to (optional — workspace-level events omit this) */
  projectId?: string;
  /** The mutated data payload */
  data: Record<string, unknown>;
  /** Who triggered the event */
  actorId: string;
  /** Unix ms timestamp */
  timestamp: number;
}

// ─── Subscriber registry ──────────────────────────────────────────────────────

type Subscriber = {
  controller: ReadableStreamDefaultController;
  workspaceId: string;
  userId: string;
};

// Global registry — survives HMR in dev via globalThis
const g = globalThis as typeof globalThis & {
  _sseSubscribers?: Map<string, Subscriber>;
};

if (!g._sseSubscribers) {
  g._sseSubscribers = new Map<string, Subscriber>();
}

const subscribers = g._sseSubscribers;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Register a new SSE subscriber.
 * Returns the subscriber id (used to unregister on disconnect).
 */
export function subscribe(
  workspaceId: string,
  userId: string,
  controller: ReadableStreamDefaultController,
): string {
  const id = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  subscribers.set(id, { controller, workspaceId, userId });
  return id;
}

/**
 * Unregister a subscriber (called when the client disconnects).
 */
export function unsubscribe(id: string): void {
  subscribers.delete(id);
}

/**
 * Broadcast an event to all subscribers of the given workspace.
 * Silently drops events for subscribers that have disconnected.
 */
export function broadcast(event: Omit<RealtimeEvent, "timestamp">): void {
  const payload: RealtimeEvent = { ...event, timestamp: Date.now() };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  for (const [id, sub] of subscribers) {
    if (sub.workspaceId !== event.workspaceId) continue;
    try {
      sub.controller.enqueue(encoded);
    } catch {
      // Controller is closed — clean up
      subscribers.delete(id);
    }
  }
}

/**
 * Send a heartbeat ping to all subscribers to keep connections alive.
 * Called every 25 seconds by the SSE route.
 */
export function pingAll(): void {
  const encoded = new TextEncoder().encode(": ping\n\n");
  for (const [id, sub] of subscribers) {
    try {
      sub.controller.enqueue(encoded);
    } catch {
      subscribers.delete(id);
    }
  }
}

/**
 * Returns the number of active subscribers for a workspace.
 * Used for presence indicators.
 */
export function getPresenceCount(workspaceId: string): number {
  let count = 0;
  for (const sub of subscribers.values()) {
    if (sub.workspaceId === workspaceId) count++;
  }
  return count;
}

/**
 * Returns unique user IDs currently connected to a workspace.
 */
export function getPresenceUsers(workspaceId: string): string[] {
  const seen = new Set<string>();
  for (const sub of subscribers.values()) {
    if (sub.workspaceId === workspaceId) seen.add(sub.userId);
  }
  return Array.from(seen);
}
