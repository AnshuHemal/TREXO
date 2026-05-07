"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeEvent, RealtimeEventType } from "@/lib/sse";

type EventHandler = (event: RealtimeEvent) => void;

interface UseRealtimeOptions {

  workspaceId: string | undefined;

  filter?: RealtimeEventType[];

  onEvent: EventHandler;

  onConnected?: () => void;

  onDisconnected?: () => void;

  enabled?: boolean;
}

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
      retryDelay.current = 1000;
      connectedRef.current?.();
    };

    es.onmessage = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as Record<string, unknown>;
        const eventType = raw.type as string;

        if (eventType === "connected") return;

        if (filter && !filter.includes(eventType as RealtimeEventType)) return;

        handlerRef.current(raw as unknown as RealtimeEvent);
      } catch {

      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      disconnectedRef.current?.();

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
