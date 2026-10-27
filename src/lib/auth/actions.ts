"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./server";

export async function signOut(formData: FormData) {
  const to = formData.get("to") === "/driver/sign-in" ? "/driver/sign-in" : "/sign-in";
  await auth.api.signOut({ headers: await headers() });
  redirect(to);
}
