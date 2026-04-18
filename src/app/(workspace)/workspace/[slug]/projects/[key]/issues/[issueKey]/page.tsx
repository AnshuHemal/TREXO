import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WorkspaceTopbar } from "../../../../_components/workspace-topbar";
import { IssueDetailPage } from "./_components/issue-detail-page";
import type { IssueLinkItem } from "../link-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssuePageProps {
  params: Promise<{ slug: string; key: string; issueKey: string }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: IssuePageProps): Promise<Metadata> {
  const { key, issueKey } = await params;
  const issueNumber = parseInt(issueKey, 10);
  if (isNaN(issueNumber)) return { title: "Issue" };

  const issue = await prisma.issue.findFirst({
    where: {
      project: { key: key.toUpperCase() },
      key: issueNumber,
    },
    select: { title: true },
  });

  return {
    title: issue
      ? `${key.toUpperCase()}-${issueNumber} · ${issue.title}`
      : "Issue not found",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IssuePage({ params }: IssuePageProps) {
  const { slug, key, issueKey } = await params;
  const user = await requireUser();

  // Parse issue number from URL (e.g. "42" from "TRX-42" or just "42")
  const rawKey = issueKey.toUpperCase().startsWith(key.toUpperCase() + "-")
    ? issueKey.slice(key.length + 1)
    : issueKey;
  const issueNumber = parseInt(rawKey, 10);
  if (isNaN(issueNumber)) notFound();

  // ── Membership check ──────────────────────────────────────────────────────────
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!membership) notFound();

  const { workspace } = membership;

  // ── Project ───────────────────────────────────────────────────────────────────
  const project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: key.toUpperCase() },
    select: { id: true, name: true, key: true },
  });
  if (!project) notFound();

  // ── Issue ─────────────────────────────────────────────────────────────────────
  const issue = await prisma.issue.findFirst({
    where: { projectId: project.id, key: issueNumber },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, image: true } } },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true, image: true } } },
      },
      labels: {
        include: { label: { select: { id: true, name: true, color: true } } },
      },
      subTasks: {
        orderBy: { key: "asc" },
        select: {
          id: true, key: true, title: true, status: true, priority: true,
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
      parent: {
        select: {
          id: true, key: true, title: true,
          project: { select: { key: true } },
        },
      },
      outgoingLinks: {
        include: {
          target: {
            select: {
              id: true, key: true, title: true,
              status: true, priority: true, type: true,
              project: { select: { key: true } },
            },
          },
        },
      },
      incomingLinks: {
        include: {
          source: {
            select: {
              id: true, key: true, title: true,
              status: true, priority: true, type: true,
              project: { select: { key: true } },
            },
          },
        },
      },
    },
  });

  if (!issue) notFound();

  // ── Workspace members ─────────────────────────────────────────────────────────
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  // ── All workspace labels ──────────────────────────────────────────────────────
  const allLabels = await prisma.label.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });

  const memberList = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    image: m.user.image,
  }));

  // Normalise links (same logic as the modal)
  const links: IssueLinkItem[] = [];
  for (const l of issue.outgoingLinks) {
    links.push({ id: l.id, type: l.type as IssueLinkItem["type"], issue: l.target });
  }
  for (const l of issue.incomingLinks) {
    const flipped =
      l.type === "BLOCKS" ? "BLOCKED_BY"
      : l.type === "BLOCKED_BY" ? "BLOCKS"
      : l.type;
    links.push({ id: l.id, type: flipped as IssueLinkItem["type"], issue: l.source });
  }

  const issueData = {
    id:          issue.id,
    key:         issue.key,
    title:       issue.title,
    description: issue.description,
    type:        issue.type,
    status:      issue.status,
    priority:    issue.priority,
    assigneeId:  issue.assigneeId,
    assignee:    issue.assignee,
    reporter:    issue.reporter,
    dueDate:     issue.dueDate,
    estimate:    issue.estimate,
    createdAt:   issue.createdAt,
    updatedAt:   issue.updatedAt,
    comments:    issue.comments,
    activities:  issue.activities,
    labels:      issue.labels,
    subTasks:    issue.subTasks,
    parent:      issue.parent,
    projectId:   issue.projectId,
    links,
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle={`${project.key}-${issue.key}`}
      />
      <IssueDetailPage
        issue={issueData}
        project={project}
        members={memberList}
        allLabels={allLabels}
        currentUserId={user.id}
        currentUserName={user.name}
        currentUserImage={user.image}
        workspaceSlug={workspace.slug}
      />
    </div>
  );
}
