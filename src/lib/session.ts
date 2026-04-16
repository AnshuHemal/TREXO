import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Session, User } from "@/lib/auth";

/**
 * Server-side session helpers.
 *
 * Use these in Server Components, Server Actions, and Route Handlers.
 * Never import auth-client.ts on the server — it's browser-only.
 *
 * @example — Server Component
 *   const session = await getSession()
 *   if (!session) redirect("/login")
 *
 * @example — Server Action
 *   const user = await requireUser()  // throws redirect if not authed
 */

// ─── getSession ───────────────────────────────────────────────────────────────

/**
 * Returns the current session or null.
 * Safe to call in any Server Component — never throws.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    return null;
  }
}

// ─── getUser ──────────────────────────────────────────────────────────────────

/**
 * Returns the current user or null.
 */
export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

// ─── requireSession ───────────────────────────────────────────────────────────

/**
 * Returns the session or redirects to /login.
 * Use in protected Server Components / Server Actions.
 */
export async function requireSession(): Promise<Session> {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session) redirect("/login");
  // redirect() throws internally — TypeScript doesn't know execution stops,
  // so we cast to satisfy the return type.
  return session as Session;
}

// ─── requireUser ─────────────────────────────────────────────────────────────

/**
 * Returns the user or redirects to /login.
 */
export async function requireUser(): Promise<User> {
  const session = await requireSession();
  return session.user;
}
