"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function WorkspaceError({
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
      title="Workspace error"
      description="Something went wrong loading this workspace. Try refreshing or go back to the dashboard."
    />
  );
}
