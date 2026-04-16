import { notFound } from "next/navigation";
import { List } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";

interface BacklogPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function BacklogPage({ params }: BacklogPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug },
    },
    include: {
      workspace: { select: { id: true } },
    },
  });

  if (!membership) {
    notFound();
  }

  const project = await prisma.project.findFirst({
    where: {
      workspaceId: membership.workspace.id,
      key: key.toUpperCase(),
    },
    select: { id: true, name: true, key: true },
  });

  if (!project) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <FadeIn direction="up" className="flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
          <List className="size-8 text-primary" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Backlog coming soon
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The backlog for{" "}
          <span className="font-medium text-foreground">{project.name}</span> is
          under construction. Check back soon.
        </p>
        <span className="mt-4 rounded-full bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
          {project.key}
        </span>
      </FadeIn>
    </main>
  );
}
