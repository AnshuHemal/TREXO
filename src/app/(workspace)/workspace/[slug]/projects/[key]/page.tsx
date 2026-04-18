import { redirect } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ slug: string; key: string }>;
}

/**
 * Root project page — redirects to the Sprint Board.
 * The Sprint Board lives at /projects/[key]/board.
 */
export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug, key } = await params;
  redirect(`/workspace/${slug}/projects/${key}/board`);
}
