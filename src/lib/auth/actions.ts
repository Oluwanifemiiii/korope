"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut(formData: FormData) {
  const to = formData.get("to") === "/driver/sign-in" ? "/driver/sign-in" : "/sign-in";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(to);
}
