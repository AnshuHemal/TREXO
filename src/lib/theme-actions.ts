"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";

export type ThemeValue = "light" | "dark" | "system";

/**
 * Persist the user's theme preference to the database.
 * Fire-and-forget safe — called from the client on every toggle.
 * NOTE: theme is stored in localStorage only (no DB column needed).
 */
export async function saveUserTheme(_theme: ThemeValue): Promise<void> {
  // Theme is managed client-side via next-themes + localStorage.
  // This function is a no-op kept for API compatibility.
}

/**
 * Returns the stored theme for the current user, or "system" as fallback.
 */
export async function getUserTheme(): Promise<ThemeValue> {
  // Theme is managed client-side — always return "system" as SSR default.
  return "system";
}
