import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";

/**
 * GET /api/search?q=...&workspaceId=...&projectId=...&status=...&priority=...&assigneeId=...
 *
 * Returns matching issues and projects for the global search palette.
 * Scoped to workspaces the current user belongs to.
 */
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q           = searchParams.get("q")?.trim() ?? "";
  const workspaceId = searchParams.get("workspaceId") ?? undefined;
  const projectId   = searchParams.get("projectId")   ?? undefined;
  const status      = searchParams.get("status")      ?? undefined;
  const priority    = searchParams.get("priority")    ?? undefined;
  const assigneeId  = searchParams.get("assigneeId")  ?? undefined;

  // Require at least 1 character to search
  if (!q && !status && !priority && !assigneeId) {
    return NextResponse.json({ issues: [], projects: [] });
  }

  // Resolve which workspaces the user can access
  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: user.id,
      ...(workspaceId ? { workspaceId } : {}),
    },
    select: { workspaceId: true },
  });

  const accessibleWorkspaceIds = memberships.map((m) => m.workspaceId);
  if (accessibleWorkspaceIds.length === 0) {
    return NextResponse.json({ issues: [], projects: [] });
  }

  // ── Issue search ────────────────────────────────────────────────────────────

  const issues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: { in: accessibleWorkspaceIds } },
      ...(projectId ? { projectId } : {}),
      ...(status    ? { status: status as never }   : {}),
      ...(priority  ? { priority: priority as never } : {}),
      ...(assigneeId === "unassigned"
        ? { assigneeId: null }
        : assigneeId
          ? { assigneeId }
          : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      key: true,
      title: true,
      status: true,
      priority: true,
      type: true,
      project: {
        select: {
          id: true,
          key: true,
          name: true,
          workspace: { select: { slug: true } },
        },
      },
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  // ── Project search ──────────────────────────────────────────────────────────

  const projects = q
    ? await prisma.project.findMany({
        where: {
          workspaceId: { in: accessibleWorkspaceIds },
          ...(workspaceId ? { workspaceId } : {}),
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { key:  { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          key: true,
          workspace: { select: { slug: true } },
          _count: { select: { issues: true } },
        },
      })
    : [];

  return NextResponse.json({ issues, projects });
}
