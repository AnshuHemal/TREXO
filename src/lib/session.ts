import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Session, User } from "@/lib/auth";

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

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function requireSession(): Promise<Session> {
  const { redirect } = await import("next/navigation");
  const session = await getSession();
  if (!session) redirect("/login");

  return session as Session;
}

export async function requireUser(): Promise<User> {
  const session = await requireSession();
  return session.user;
}
