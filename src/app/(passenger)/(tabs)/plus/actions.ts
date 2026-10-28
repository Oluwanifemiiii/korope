"use server";

import { headers } from "next/headers";
import { getSession } from "@/lib/auth/server";
import { koropePlusLead } from "@/lib/contracts/leads";
import { asAnon, asUser, rateLimit } from "@/lib/db";

export type LeadState = { ok: boolean; message?: string; errors?: Partial<Record<"organisation" | "riders" | "contact", string>> };

export async function registerInterest(_prev: LeadState, form: FormData): Promise<LeadState> {
  const parsed = koropePlusLead.safeParse({
    organisation: form.get("organisation"),
    riders: form.get("riders"),
    contact: form.get("contact"),
  });
  if (!parsed.success) {
    const errors: LeadState["errors"] = {};
    for (const i of parsed.error.issues) errors[i.path[0] as keyof NonNullable<LeadState["errors"]>] ??= i.message;
    return { ok: false, errors };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`lead:ip:${ip}`, 5, 3600))) {
    return { ok: false, message: "We've had a few forms from this connection. Try again in an hour." };
  }

  const { organisation, riders, contact } = parsed.data;
  const session = await getSession();
  const insert = "insert into public.korope_plus_leads (user_id, organisation, riders, contact) values ($1, $2, $3, $4)";
  try {
    if (session) await asUser(session.user.id, (c) => c.query(insert, [session.user.id, organisation, riders, contact]));
    else await asAnon((c) => c.query(insert, [null, organisation, riders, contact]));
  } catch {
    return { ok: false, message: "We couldn't save that just now. Try again in a moment." };
  }
  return { ok: true };
}
