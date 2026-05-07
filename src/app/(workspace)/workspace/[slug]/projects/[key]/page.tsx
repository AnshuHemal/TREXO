import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ slug: string; key: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug, key } = await params;
  redirect(`/workspace/${slug}/projects/${key}/board`);
}
