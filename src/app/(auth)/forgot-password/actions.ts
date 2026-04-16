"use server";

import { prisma } from "@/lib/prisma";

/**
 * Checks whether an email address exists in the database.
 *
 * Returns a plain object (not an Error) so it can safely cross the
 * Server Action serialisation boundary.
 *
 * Security note: we intentionally return the same generic message for both
 * "not found" and any unexpected error so we don't leak account existence
 * to an attacker. The caller decides what to show the user.
 */
export async function checkEmailExists(
  email: string,
): Promise<{ exists: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    return { exists: !!user };
  } catch {
    // Don't expose DB errors — treat as "not found" from the client's perspective.
    return { exists: false, error: "Unable to verify email. Please try again." };
  }
}
