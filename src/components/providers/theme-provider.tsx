"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

/**
 * Wraps next-themes ThemeProvider.
 * Kept as a thin client boundary so the root layout stays a Server Component.
 *
 * The `scriptProps` with `suppressHydrationWarning` silences the React 19
 * dev-mode warning about script tags inside components — next-themes injects
 * one for theme detection and this is expected/safe behaviour.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{ suppressHydrationWarning: true } as never}
    >
      {children}
    </NextThemesProvider>
  );
}
