import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { parseCustomFieldsConfig } from "@/lib/custom-fields";
import { CustomFieldsEditor } from "./_components/custom-fields-editor";

interface CustomFieldsPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export async function generateMetadata({ params }: CustomFieldsPageProps): Promise<Metadata> {
  const { key } = await params;
  return { title: `Custom Fields — ${key.toUpperCase()}` };
}

export default async function CustomFieldsPage({ params }: CustomFieldsPageProps) {
  const { slug, key } = await params;
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug }, role: { in: ["OWNER", "ADMIN"] } },
    include: { workspace: { select: { id: true, name: true, slug: true } } },
  });
  if (!membership) notFound();

  const { workspace } = membership;

  const project = await prisma.project.findFirst({
    where: { workspaceId: workspace.id, key: key.toUpperCase() },
    select: { id: true, name: true, key: true, customFieldsConfig: true },
  });
  if (!project) notFound();

  const config = parseCustomFieldsConfig(project.customFieldsConfig);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <FadeIn direction="down" className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Custom Fields</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define extra fields for issues in <span className="font-medium text-foreground">{project.name}</span>.
          Values are stored per-issue and shown in the issue detail sidebar.
        </p>
      </FadeIn>

      <CustomFieldsEditor
        projectId={project.id}
        initialConfig={config}
      />
    </main>
  );
}
