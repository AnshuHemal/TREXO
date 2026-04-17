/**
 * Project access control helpers.
 *
 * Rules:
 * - PUBLIC projects: all workspace members can access
 * - PRIVATE projects: only workspace OWNER/ADMIN + explicit ProjectMembers
 * - Workspace OWNER/ADMIN always bypass project-level restrictions
 */

import { prisma } from "@/lib/prisma";

export type ProjectAccessResult =
  | { allowed: true; role: "OWNER" | "ADMIN" | "LEAD" | "MEMBER" | "VIEWER" }
  | { allowed: false };

/**
 * Check if a user can access a project.
 * Returns the effective role if allowed.
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectAccessResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      visibility: true,
      workspaceId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!project) return { allowed: false };

  // Check workspace membership + role
  const wsMember = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: project.workspaceId },
    select: { role: true },
  });

  if (!wsMember) return { allowed: false };

  // Workspace OWNER/ADMIN always have access
  if (wsMember.role === "OWNER") return { allowed: true, role: "OWNER" };
  if (wsMember.role === "ADMIN") return { allowed: true, role: "ADMIN" };

  // PUBLIC: all workspace members can access
  if (project.visibility === "PUBLIC") {
    const projectRole = project.members[0]?.role ?? "MEMBER";
    return { allowed: true, role: projectRole as "LEAD" | "MEMBER" | "VIEWER" };
  }

  // PRIVATE: only explicit project members
  if (project.members.length > 0) {
    return { allowed: true, role: project.members[0].role as "LEAD" | "MEMBER" | "VIEWER" };
  }

  return { allowed: false };
}

/**
 * Check if a user can manage a project (change settings, visibility, members).
 * Requires workspace OWNER/ADMIN or project LEAD.
 */
export async function canManageProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const access = await checkProjectAccess(userId, projectId);
  if (!access.allowed) return false;
  return ["OWNER", "ADMIN", "LEAD"].includes(access.role);
}

/**
 * Filter a list of projects to only those the user can access.
 * Used in sidebar and project list pages.
 */
export async function filterAccessibleProjects(
  userId: string,
  workspaceId: string,
  projectIds: string[],
): Promise<string[]> {
  if (projectIds.length === 0) return [];

  // Workspace OWNER/ADMIN see everything
  const wsMember = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  });

  if (!wsMember) return [];
  if (wsMember.role === "OWNER" || wsMember.role === "ADMIN") return projectIds;

  // For others: PUBLIC projects + PRIVATE projects they're a member of
  const projects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      OR: [
        { visibility: "PUBLIC" },
        { visibility: "PRIVATE", members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });

  return projects.map((p) => p.id);
}
