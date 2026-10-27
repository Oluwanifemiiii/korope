import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiredRole, signInPathFor, type AppRole } from "@/lib/auth/routes";

/**
 * Refreshes the Supabase session cookie and routes by role. This is an optimistic
 * check for navigation only: RLS and the database functions enforce access.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims verifies the JWT; never trust an unverified session for routing.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const roles = (claims?.app_roles as AppRole[] | undefined) ?? [];

  const { pathname, search } = request.nextUrl;
  const need = requiredRole(pathname);
  if (!need) return response;

  if (!claims || (need !== "passenger" && !roles.includes(need))) {
    const target = request.nextUrl.clone();
    target.pathname = signInPathFor(need);
    target.search = `?next=${encodeURIComponent(pathname + search)}`;
    if (claims) target.searchParams.set("reason", "role");
    const redirect = NextResponse.redirect(target);
    for (const c of response.cookies.getAll()) redirect.cookies.set(c);
    return redirect;
  }
  return response;
}

export const config = {
  // Skip static assets, the service worker, the manifest and webhooks.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|api/paystack|api/auth/sms-hook|.*\\.(?:png|svg|jpg|jpeg|webp|avif|woff2)$).*)",
  ],
};
