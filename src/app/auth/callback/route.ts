import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

/** OAuth (Google) return URL: exchange the code for a session cookie, then continue. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const back = new URL("/sign-in", origin);
  back.searchParams.set("next", next);
  back.searchParams.set("error", "oauth");
  return NextResponse.redirect(back);
}
