import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";

/**
 * GET /api/issues/[id]
 * Returns full issue detail including comments, activities, labels,
 * sub-tasks, and parent issue info.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, image: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        include: {
          actor: { select: { id: true, name: true, image: true } },
        },
      },
      labels: {
        include: {
          label: { select: { id: true, name: true, color: true } },
        },
      },
      // Sub-tasks
      subTasks: {
        orderBy: { key: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          status: true,
          priority: true,
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
      // Parent issue (for breadcrumb in sub-task detail)
      parent: {
        select: {
          id: true,
          key: true,
          title: true,
          project: { select: { key: true } },
        },
      },
    },
  });

  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(issue);
}
