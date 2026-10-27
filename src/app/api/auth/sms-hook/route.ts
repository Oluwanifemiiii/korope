import { Webhook } from "standardwebhooks";
import { sendSmsHookPayload } from "@/lib/contracts/auth";
import { serverEnv } from "@/lib/env";
import { rateLimit } from "@/lib/supabase/service";
import { sendSms, TermiiError } from "@/lib/termii";

/**
 * Supabase Auth "Send SMS" hook. Supabase signs the request (Standard Webhooks);
 * we verify, rate-limit per phone, and send the OTP through Termii.
 * Returning an error makes Supabase report the failure instead of a silent success.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const env = serverEnv();

  let payload: unknown;
  try {
    const wh = new Webhook(env.SEND_SMS_HOOK_SECRET.replace("v1,whsec_", ""));
    payload = wh.verify(raw, Object.fromEntries(request.headers));
  } catch {
    return hookError(401, "Invalid signature");
  }

  const parsed = sendSmsHookPayload.safeParse(payload);
  if (!parsed.success) return hookError(400, "Unexpected payload");
  const { user, sms } = parsed.data;
  const phone = user.phone.replace(/\D/g, "");

  // 3 codes per phone per 10 minutes (ARCHITECTURE section 11). Supabase also throttles to one per 60 s.
  if (!(await rateLimit(`otp:phone:${phone}`, 3, 600))) {
    return hookError(429, "Too many codes requested. Wait a few minutes and try again.");
  }

  try {
    await sendSms(phone, `Your Korope code is ${sms.otp}. It expires in 5 minutes. Never share it.`);
  } catch (e) {
    const status = e instanceof TermiiError ? 502 : 504;
    console.error("termii send failed", { status, error: e instanceof Error ? e.message : e });
    return hookError(status, "We couldn't send the SMS. Try again in a moment.");
  }

  return Response.json({});
}

function hookError(status: number, message: string) {
  return Response.json({ error: { http_code: status, message } }, { status });
}
