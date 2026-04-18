"use server";

import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/session";

export type ThemeValue = "light" | "dark" | "system";

/**
 * Persist the user's theme preference to the database.
 * Fire-and-forget safe — called from the client on every toggle.
 */
export async function saveUserTheme(theme: ThemeValue): Promise<void> {
  const user = await getUser();
  if (!user) return;

  // Validate — never write arbitrary strings
  if (!["light", "dark", "system"].includes(theme)) return;

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { theme },
    });
  } catch {
    // Non-critical — silently ignore
  }
}

/**
 * Returns the stored theme for the current user, or "system" as fallback.
 * Used server-side in the root layout to seed the initial theme.
 */
export async function getUserTheme(): Promise<ThemeValue> {
  const user = await getUser();
  if (!user) return "system";

  try {
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { theme: true },
    });
    const t = row?.theme ?? "system";
    if (t === "light" || t === "dark" || t === "system") return t;
    return "system";
  } catch {
    return "system";
  }
}
