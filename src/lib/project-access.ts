

import { prisma } from "@/lib/prisma";

export type ProjectAccessResult =
  | { allowed: true; role: "OWNER" | "ADMIN" | "LEAD" | "MEMBER" | "VIEWER" }
  | { allowed: false };

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

  const wsMember = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: project.workspaceId },
    select: { role: true },
  });

  if (!wsMember) return { allowed: false };

  if (wsMember.role === "OWNER") return { allowed: true, role: "OWNER" };
  if (wsMember.role === "ADMIN") return { allowed: true, role: "ADMIN" };

  if (project.visibility === "PUBLIC") {
    const projectRole = project.members[0]?.role ?? "MEMBER";
    return { allowed: true, role: projectRole as "LEAD" | "MEMBER" | "VIEWER" };
  }

  if (project.members.length > 0) {
    return { allowed: true, role: project.members[0].role as "LEAD" | "MEMBER" | "VIEWER" };
  }

  return { allowed: false };
}

export async function canManageProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  const access = await checkProjectAccess(userId, projectId);
  if (!access.allowed) return false;
  return ["OWNER", "ADMIN", "LEAD"].includes(access.role);
}

export async function filterAccessibleProjects(
  userId: string,
  workspaceId: string,
  projectIds: string[],
): Promise<string[]> {
  if (projectIds.length === 0) return [];

  const wsMember = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId },
    select: { role: true },
  });

  if (!wsMember) return [];
  if (wsMember.role === "OWNER" || wsMember.role === "ADMIN") return projectIds;

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
