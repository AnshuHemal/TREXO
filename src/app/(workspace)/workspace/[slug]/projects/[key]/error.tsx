"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      title="Project error"
      description="Something went wrong loading this project. Try refreshing or go back to the workspace."
    />
  );
}
