import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 Proxy (replaces middleware.ts).
 *
 * Two responsibilities:
 *   1. Redirect unauthenticated users away from protected routes → /login
 *   2. Redirect authenticated users away from auth pages → /dashboard
 *
 * ⚠️  This is an OPTIMISTIC check based on cookie presence only.
 *     It is NOT a security boundary — full session validation happens inside
 *     each protected layout/page via requireSession() in src/lib/session.ts.
 *
 * Docs: https://better-auth.com/docs/integrations/next#nextjs-16-proxy
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // ─── 1. Protected routes — must be authenticated ──────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const url = new URL("/login", request.url);
    // Preserve the intended destination for post-login redirect.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ─── 2. Auth routes — skip if already authenticated ───────────────────────
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

// ─── Route lists ──────────────────────────────────────────────────────────────

/**
 * Prefixes that require a valid session.
 * Add new protected sections here as the app grows.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workspace",
  "/settings",
  "/onboarding",
];

/**
 * Auth pages that logged-in users should be bounced away from.
 */
const AUTH_ROUTES = ["/login", "/signup", "/verify-email"];

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run on all paths EXCEPT:
     *   - _next/static   Next.js static assets
     *   - _next/image    Next.js image optimisation
     *   - favicon.ico
     *   - /api/auth/*    Better Auth handler (must stay public)
     *   - Static files   .svg .png .jpg .jpeg .gif .webp .ico .woff2
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
