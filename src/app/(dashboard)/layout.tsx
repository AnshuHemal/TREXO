import { requireSession } from "@/lib/session";

/**
 * Dashboard layout — server-side session guard.
 *
 * Every route under (dashboard) is protected. proxy.ts handles the
 * optimistic cookie-based redirect, but this layout performs the real
 * server-side validation so security doesn't depend on the cookie alone.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireSession() calls redirect("/login") internally if no valid session.
  // This is the authoritative auth check — proxy.ts is just a fast hint.
  await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      {children}
    </div>
  );
}
