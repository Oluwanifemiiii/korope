export type AppRole = "passenger" | "driver" | "ops_admin";

/** Where each surface sends people who aren't signed in or lack the role. */
export const SIGN_IN = {
  passenger: "/sign-in",
  driver: "/driver/sign-in",
  ops: "/sign-in",
} as const;

// Exact paths, or prefixes ending in "/". Home is public so the map shows before sign-in.
const PUBLIC_PASSENGER = ["/welcome", "/sign-in", "/legal", "/privacy", "/terms", "/t/", "/offline", "/plus", "/search", "/stops/"];

/** Which role a path needs, or null if it is public. Routing only; RLS is the real gate. */
export function requiredRole(pathname: string): AppRole | null {
  if (pathname === SIGN_IN.driver || pathname.startsWith("/auth/")) return null;
  if (pathname === "/driver" || pathname.startsWith("/driver/")) return "driver";
  if (pathname === "/ops" || pathname.startsWith("/ops/")) return "ops_admin";
  if (pathname === "/" || pathname.startsWith("/api/")) return null;
  const isPublic = PUBLIC_PASSENGER.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
  return isPublic ? null : "passenger";
}

export function signInPathFor(role: AppRole): string {
  return role === "driver" ? SIGN_IN.driver : role === "ops_admin" ? SIGN_IN.ops : SIGN_IN.passenger;
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
