"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/sse";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventHandler = (event: RealtimeEvent) => void;

interface UseRealtimeOptions {
  /** Workspace to subscribe to */
  workspaceId: string | undefined;
  /** Optional: only fire handler for these event types */
  filter?: RealtimeEventType[];
  /** Called when a matching event arrives */
  onEvent: EventHandler;
  /** Called when the connection is established */
  onConnected?: () => void;
  /** Called when the connection is lost (before reconnect) */
  onDisconnected?: () => void;
  /** Disable the subscription (e.g. when workspaceId is not yet known) */
  enabled?: boolean;
}

/**
 * useRealtime — subscribes to the SSE stream for a workspace.
 *
 * Features:
 *   - Automatic reconnect with exponential back-off (1s → 2s → 4s → max 30s)
 *   - Cleans up EventSource on unmount
 *   - Stable handler reference via ref (no need to memoize onEvent)
 *   - Filters events by type if `filter` is provided
 */
export function useRealtime({
  workspaceId,
  filter,
  onEvent,
  onConnected,
  onDisconnected,
  enabled = true,
}: UseRealtimeOptions): void {
  const handlerRef     = useRef(onEvent);
  const connectedRef   = useRef(onConnected);
  const disconnectedRef = useRef(onDisconnected);

  // Keep refs up-to-date without re-subscribing
  handlerRef.current      = onEvent;
  connectedRef.current    = onConnected;
  disconnectedRef.current = onDisconnected;

  const retryDelay = useRef(1000);
  const esRef      = useRef<EventSource | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!workspaceId || !enabled) return;

    const url = `/api/sse?workspaceId=${encodeURIComponent(workspaceId)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      retryDelay.current = 1000; // reset back-off on successful connect
      connectedRef.current?.();
    };

    es.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;
        const eventType = raw.type as string;

        // Skip the internal "connected" confirmation message
        if (eventType === "connected") return;

        // Apply type filter if provided
        if (filter && !filter.includes(eventType as RealtimeEventType)) return;

        handlerRef.current(raw as unknown as RealtimeEvent);
      } catch {
        // Malformed event — ignore
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      disconnectedRef.current?.();

      // Exponential back-off: 1s, 2s, 4s, 8s, 16s, 30s max
      const delay = Math.min(retryDelay.current, 30_000);
      retryDelay.current = Math.min(retryDelay.current * 2, 30_000);

      timerRef.current = setTimeout(connect, delay);
    };
  }, [workspaceId, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !workspaceId) return;

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [connect, enabled, workspaceId]);
}
