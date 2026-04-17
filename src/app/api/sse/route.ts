import { type NextRequest } from "next/server";
import { getUser } from "@/lib/session";
import { subscribe, unsubscribe, pingAll } from "@/lib/sse";

/**
 * GET /api/sse?workspaceId=...
 *
 * Server-Sent Events endpoint.
 * Clients connect once per workspace and receive a stream of RealtimeEvent objects.
 *
 * Protocol:
 *   - Each event is a standard SSE `data:` line followed by \n\n
 *   - Comment lines (`: ping\n\n`) are sent every 25s to keep the connection alive
 *     and prevent proxy/load-balancer timeouts.
 *   - Clients should reconnect automatically (EventSource does this natively).
 *
 * Security:
 *   - Requires a valid session (checked server-side via cookie).
 *   - workspaceId is validated against the user's memberships.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Heartbeat interval — 25s keeps most proxies happy (nginx default timeout is 60s)
const HEARTBEAT_MS = 25_000;

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  // Validate membership (lazy import to avoid circular deps)
  const { prisma } = await import("@/lib/prisma");
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId },
    select: { id: true },
  });

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  // ── Stream setup ──────────────────────────────────────────────────────────────

  let subscriberId: string;
  let heartbeatTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      subscriberId = subscribe(workspaceId, user.id, controller);

      // Send initial connection confirmation
      const connected = JSON.stringify({
        type: "connected",
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
      });
      controller.enqueue(
        new TextEncoder().encode(`data: ${connected}\n\n`),
      );

      // Heartbeat to keep the connection alive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, HEARTBEAT_MS);
    },

    cancel() {
      clearInterval(heartbeatTimer);
      unsubscribe(subscriberId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
