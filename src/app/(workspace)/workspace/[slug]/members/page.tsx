import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { WorkspaceTopbar } from "../_components/workspace-topbar";
import { MembersList } from "./_components/members-list";
import { InviteMemberForm } from "./_components/invite-member-form";
import type { WorkspaceRole } from "@/generated/prisma/enums";

interface MembersPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: MembersPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: workspace ? `Members — ${workspace.name}` : "Members" };
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { slug } = await params;
  const user = await requireUser();

  // Verify membership
  const currentMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!currentMembership) {
    notFound();
  }

  const { workspace } = currentMembership;

  // Fetch all members with user data
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [
      // OWNER first, then by join date
      { createdAt: "asc" },
    ],
  });

  const canInvite =
    currentMembership.role === "OWNER" ||
    currentMembership.role === "ADMIN";

  const memberItems = members.map((m) => ({
    id: m.id,
    role: m.role as WorkspaceRole,
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      image: m.user.image,
    },
  }));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <WorkspaceTopbar
        workspaceName={workspace.name}
        workspaceSlug={workspace.slug}
        pageTitle="Members"
      />

      <main className="flex-1 p-6">
        <FadeIn direction="down" className="mb-6">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Members
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"} in
            this workspace.
          </p>
        </FadeIn>

        <div className="flex max-w-2xl flex-col gap-6">
          {/* Invite form — OWNER/ADMIN only */}
          {canInvite && (
            <FadeIn delay={0.05}>
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="mb-1 text-base font-semibold text-foreground">
                  Add member
                </h2>
                <p className="mb-5 text-sm text-muted-foreground">
                  Add an existing Trexo user to this workspace by email.
                </p>
                <InviteMemberForm workspaceId={workspace.id} />
              </div>
            </FadeIn>
          )}

          {/* Members list */}
          <FadeIn delay={0.1}>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                All members
              </h2>
              <MembersList
                members={memberItems}
                currentUserId={user.id}
                currentUserRole={currentMembership.role as WorkspaceRole}
                workspaceId={workspace.id}
              />
            </div>
          </FadeIn>
        </div>
      </main>
    </div>
  );
}
