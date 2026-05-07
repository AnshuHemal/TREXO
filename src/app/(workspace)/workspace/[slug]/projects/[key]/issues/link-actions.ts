"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type LinkType = "BLOCKS" | "BLOCKED_BY" | "DUPLICATES" | "RELATES_TO";

export interface IssueLinkItem {
  id: string;
  type: LinkType;
  issue: {
    id: string;
    key: number;
    title: string;
    status: string;
    priority: string;
    type: string;
    project: { key: string };
  };
}

export async function searchIssuesForLink(
  currentIssueId: string,
  projectId: string,
  query: string,
): Promise<ActionResult<IssueLinkItem["issue"][]>> {
  await requireUser();

  if (!query.trim()) return { success: true, data: [] };

  try {

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });
    if (!project) return { success: false, error: "Project not found." };

    const q = query.trim().toLowerCase();

    const issues = await prisma.issue.findMany({
      where: {
        project: { workspaceId: project.workspaceId },
        id: { not: currentIssueId },
        parentId: null,
        OR: [
          { title: { contains: q, mode: "insensitive" } },

          ...(q.includes("-")
            ? [{
                AND: [
                  { project: { key: { equals: q.split("-")[0].toUpperCase() } } },
                  { key: { equals: parseInt(q.split("-")[1]) || 0 } },
                ],
              }]
            : []),
        ],
      },
      select: {
        id: true,
        key: true,
        title: true,
        status: true,
        priority: true,
        type: true,
        project: { select: { key: true } },
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });

    return { success: true, data: issues };
  } catch {
    return { success: false, error: "Search failed." };
  }
}

export async function createIssueLink(
  sourceId: string,
  targetId: string,
  type: LinkType,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  if (sourceId === targetId) {
    return { success: false, error: "Cannot link an issue to itself." };
  }

  try {

    const existing = await prisma.issueLink.findFirst({
      where: { sourceId, targetId, type },
    });
    if (existing) {
      return { success: false, error: "This link already exists." };
    }

    const link = await prisma.issueLink.create({
      data: { sourceId, targetId, type },
      select: { id: true },
    });

    await prisma.activity.create({
      data: {
        issueId: sourceId,
        actorId: (await requireUser()).id,
        type: "link_added",
        toValue: type,
      },
    }).catch(() => {});

    return { success: true, data: { id: link.id } };
  } catch {
    return { success: false, error: "Failed to create link." };
  }
}

export async function deleteIssueLink(linkId: string): Promise<ActionResult> {
  await requireUser();

  try {
    await prisma.issueLink.delete({ where: { id: linkId } });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove link." };
  }
}

export async function getIssueLinks(issueId: string): Promise<ActionResult<IssueLinkItem[]>> {
  await requireUser();

  try {
    const [outgoing, incoming] = await Promise.all([
      prisma.issueLink.findMany({
        where: { sourceId: issueId },
        include: {
          target: {
            select: {
              id: true, key: true, title: true,
              status: true, priority: true, type: true,
              project: { select: { key: true } },
            },
          },
        },
      }),
      prisma.issueLink.findMany({
        where: { targetId: issueId },
        include: {
          source: {
            select: {
              id: true, key: true, title: true,
              status: true, priority: true, type: true,
              project: { select: { key: true } },
            },
          },
        },
      }),
    ]);

    const links: IssueLinkItem[] = [
      ...outgoing.map((l) => ({
        id: l.id,
        type: l.type as LinkType,
        issue: l.target,
      })),
      ...incoming.map((l) => ({
        id: l.id,

        type: flipLinkType(l.type as LinkType),
        issue: l.source,
      })),
    ];

    return { success: true, data: links };
  } catch {
    return { success: false, error: "Failed to fetch links." };
  }
}

function flipLinkType(type: LinkType): LinkType {
  if (type === "BLOCKS")     return "BLOCKED_BY";
  if (type === "BLOCKED_BY") return "BLOCKS";
  return type;
}
