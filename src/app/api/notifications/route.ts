import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";

/**
 * GET /api/notifications
 * Returns the last 20 notifications for the current user.
 * Also returns the unread count.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        actor: { select: { id: true, name: true, image: true } },
        issue: {
          select: {
            id: true,
            key: true,
            title: true,
            project: { select: { key: true, workspace: { select: { slug: true } } } },
          },
        },
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, read: false },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

/**
 * PATCH /api/notifications
 * Mark notifications as read.
 * Body: { ids?: string[] }  — if omitted, marks ALL as read.
 */
export async function PATCH(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids: string[] | undefined = body.ids;

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
