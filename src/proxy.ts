import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { requiredRole, signInPathFor } from "@/lib/auth/routes";

/**
 * Optimistic routing only: sends visitors without a session cookie to the right
 * sign-in screen. Roles are checked in the /driver and /ops layouts against the
 * database (requireRole), and RLS enforces data access.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const need = requiredRole(pathname);
  if (!need || getSessionCookie(request)) return NextResponse.next();

  const target = request.nextUrl.clone();
  target.pathname = signInPathFor(need);
  target.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(target);
}

export const config = {
  // Skip static assets, the service worker, the manifest, auth endpoints and webhooks.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|serwist/|manifest.webmanifest|api/|.*\\.(?:png|svg|jpg|jpeg|webp|avif|woff2)$).*)",
  ],
};
