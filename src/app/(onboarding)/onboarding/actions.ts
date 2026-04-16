"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// ─── checkSlugAvailable ───────────────────────────────────────────────────────

/**
 * Checks whether a workspace slug is available.
 * Called on-the-fly as the user types the slug field.
 */
export async function checkSlugAvailable(
  slug: string,
): Promise<{ available: boolean }> {
  if (!slug || slug.length < 2) return { available: false };

  const existing = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  return { available: !existing };
}

// ─── createWorkspace ──────────────────────────────────────────────────────────

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

export interface CreateWorkspaceResult {
  workspaceId: string;
  slug: string;
}

/**
 * Creates a new workspace and adds the current user as OWNER.
 * Validates name + slug, checks slug uniqueness, then creates both
 * Workspace and WorkspaceMember records in a single transaction.
 */
export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<ActionResult<CreateWorkspaceResult>> {
  const user = await requireUser();

  // ── Validation ──────────────────────────────────────────────────────────────
  const fieldErrors: Record<string, string> = {};

  const name = input.name.trim();
  if (!name) fieldErrors.name = "Workspace name is required.";
  else if (name.length < 2) fieldErrors.name = "Name must be at least 2 characters.";
  else if (name.length > 64) fieldErrors.name = "Name must be 64 characters or fewer.";

  const slug = input.slug.trim().toLowerCase();
  if (!slug) fieldErrors.slug = "URL slug is required.";
  else if (!/^[a-z0-9-]+$/.test(slug)) fieldErrors.slug = "Only lowercase letters, numbers, and hyphens.";
  else if (slug.length < 2) fieldErrors.slug = "Slug must be at least 2 characters.";
  else if (slug.length > 48) fieldErrors.slug = "Slug must be 48 characters or fewer.";
  else if (slug.startsWith("-") || slug.endsWith("-")) fieldErrors.slug = "Slug cannot start or end with a hyphen.";

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  // ── Slug uniqueness ─────────────────────────────────────────────────────────
  const existing = await prisma.workspace.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    return {
      success: false,
      fieldErrors: { slug: "This URL is already taken. Try another." },
    };
  }

  // ── Create workspace + owner membership in a transaction ────────────────────
  try {
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name, slug },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: ws.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return ws;
    });

    return {
      success: true,
      data: { workspaceId: workspace.id, slug: workspace.slug },
    };
  } catch {
    return {
      success: false,
      error: "Failed to create workspace. Please try again.",
    };
  }
}

// ─── sendInvites ──────────────────────────────────────────────────────────────

export interface SendInvitesInput {
  workspaceId: string;
  emails: string[];
}

/**
 * Sends workspace invitations.
 *
 * For v1 this is a stub — it validates the emails and returns success.
 * In a future iteration this will send invitation emails via Resend and
 * create pending WorkspaceMember records.
 */
export async function sendInvites(
  input: SendInvitesInput,
): Promise<ActionResult> {
  await requireUser();

  const validEmails = input.emails
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (validEmails.length === 0) {
    return { success: false, error: "No valid email addresses provided." };
  }

  // TODO: send invitation emails via Resend + create pending memberships
  // For now, just acknowledge the invites were received.
  console.log(
    `[Invites] Would send invitations to: ${validEmails.join(", ")} for workspace ${input.workspaceId}`,
  );

  return { success: true };
}

// ─── completeOnboarding ───────────────────────────────────────────────────────

/**
 * Called at the end of the wizard to redirect the user into their workspace.
 * Using a Server Action for the redirect ensures it happens server-side
 * and avoids the router-not-initialized issue.
 */
export async function completeOnboarding(slug: string): Promise<never> {
  redirect(`/workspace/${slug}`);
}
