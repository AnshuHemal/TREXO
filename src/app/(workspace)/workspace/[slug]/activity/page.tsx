import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { ActivityClient } from "./_components/activity-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    actor?: string;
    project?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: ActivityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `Activity — ${workspace.name}` : "Activity" };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ActivityPage({
  params,
  searchParams,
}: ActivityPageProps) {
  const { slug } = await params;
  const sp       = await searchParams;
  const user     = await requireUser();

  // ── Membership check ──────────────────────────────────────────────────────────
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });

  if (!membership) notFound();

  const { workspace } = membership;
  const isAdminOrOwner =
    membership.role === "OWNER" || membership.role === "ADMIN";

  // ── Parse filters from URL ────────────────────────────────────────────────────
  const page      = Math.max(1, parseInt(sp.page ?? "1", 10));
  const actorId   = sp.actor   || undefined;
  const projectId = sp.project || undefined;
  const typeFilter = sp.type   || undefined;
  const fromDate  = sp.from ? new Date(sp.from) : undefined;
  const toDate    = sp.to   ? new Date(sp.to + "T23:59:59.999Z") : undefined;

  // ── Build where clause ────────────────────────────────────────────────────────
  const where = {
    issue: {
      project: {
        workspaceId: workspace.id,
        ...(projectId ? { id: projectId } : {}),
      },
    },
    ...(actorId    ? { actorId }                                    : {}),
    ...(typeFilter ? { type: typeFilter }                           : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate   ? { lte: toDate   } : {}),
          },
        }
      : {}),
  };

  // ── Parallel queries ──────────────────────────────────────────────────────────
  const [activities, totalCount, members, projects] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      select: {
        id:        true,
        type:      true,
        fromValue: true,
        toValue:   true,
        createdAt: true,
        actor: {
          select: { id: true, name: true, image: true },
        },
        issue: {
          select: {
            id:    true,
            key:   true,
            title: true,
            project: {
              select: { id: true, key: true, name: true },
            },
          },
        },
      },
    }),

    prisma.activity.count({ where }),

    // All workspace members for the actor filter
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      select: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),

    // All accessible projects for the project filter
    prisma.project.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, key: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Activity"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Workspace Activity
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit log of all changes across every project in this workspace.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {totalCount.toLocaleString()} {totalCount === 1 ? "event" : "events"}
              </span>
            </div>
          </div>
        </FadeIn>

        <ActivityClient
          activities={activities.map((a) => ({
            ...a,
            createdAt: a.createdAt,
          }))}
          members={members.map((m) => m.user)}
          projects={projects}
          workspaceSlug={workspace.slug}
          isAdminOrOwner={isAdminOrOwner}
          // Pagination
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
          // Active filters
          activeActorId={actorId ?? null}
          activeProjectId={projectId ?? null}
          activeType={typeFilter ?? null}
          activeFrom={sp.from ?? null}
          activeTo={sp.to ?? null}
        />
      </main>
    </div>
  );
}
