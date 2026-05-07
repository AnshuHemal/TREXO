"use client";

import { ErrorScreen } from "@/components/shared/error-screen";

export default function SettingsError({
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
      title="Settings error"
      description="Something went wrong loading your settings. Please try again."
    />
  );
}
