"use server";

import { headers } from "next/headers";
import { nigerianPhone } from "@/lib/contracts/auth";
import { asService, rateLimit } from "@/lib/db";

/**
 * Drivers are pre-registered by ops. Before sending a code on /driver/sign-in we
 * check the phone against that list, so the screen can say why sign-in won't work.
 * The real gate is the driver role, which only a verified, pre-registered phone receives.
 */
export async function checkDriverPhone(raw: string): Promise<{ ok: boolean; message?: string }> {
  const parsed = nigerianPhone.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await rateLimit(`driver-check:ip:${ip}`, 10, 3600))) {
    return { ok: false, message: "Too many attempts from this phone. Wait a while and try again." };
  }

  try {
    const allowed = await asService(async (c) => {
      const { rows } = await c.query<{ ok: boolean }>("select private.can_driver_sign_in($1) as ok", [parsed.data]);
      return rows[0].ok;
    });
    if (!allowed) {
      return {
        ok: false,
        message: "This number isn't registered as a Korope driver. Ask your fleet manager to add it.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "We couldn't check your number just now. Try again in a moment." };
  }
}
