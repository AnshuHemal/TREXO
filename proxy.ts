import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !sessionCookie) {
    const url = new URL("/login", request.url);

    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/workspace",
  "/settings",
  "/onboarding",
];

const AUTH_ROUTES = ["/login", "/signup", "/verify-email", "/forgot-password"];

export const config = {
  matcher: [

    "/((?!_next/static|_next/image|favicon\\.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)",
  ],
};
