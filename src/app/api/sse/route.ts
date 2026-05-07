import { type NextRequest } from "next/server";
import { getUser } from "@/lib/session";
import { subscribe, unsubscribe, pingAll } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const { prisma } = await import("@/lib/prisma");
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId },
    select: { id: true },
  });

  if (!membership) {
    return new Response("Forbidden", { status: 403 });
  }

  let subscriberId: string;
  let heartbeatTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      subscriberId = subscribe(workspaceId, user.id, controller);

      const connected = JSON.stringify({
        type: "connected",
        workspaceId,
        userId: user.id,
        timestamp: Date.now(),
      });
      controller.enqueue(
        new TextEncoder().encode(`data: ${connected}\n\n`),
      );

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
      "X-Accel-Buffering": "no",
    },
  });
}
