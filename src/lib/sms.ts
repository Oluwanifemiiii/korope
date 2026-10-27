import "server-only";
import { shouldLogOtp, smsConfigured, smsEnv } from "@/lib/env";

export class SmsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const LIVE_URL = "https://api.africastalking.com/version1/messaging";
const SANDBOX_URL = "https://api.sandbox.africastalking.com/version1/messaging";

/**
 * Sends one SMS through Africa's Talking (D-026). `to` is E.164 with the plus.
 * OTPs must go out from a registered sender ID, or Nigerian numbers on DND won't get them.
 */
export async function sendSms(to: string, message: string, { timeoutMs = 8000 } = {}): Promise<string> {
  if (shouldLogOtp()) {
    console.info(`[dev sms] to ${to}: ${message}`);
    return "dev-log";
  }
  if (!smsConfigured()) {
    throw new SmsError(
      "SMS is not configured. Set AT_USERNAME and AT_API_KEY, or DEV_LOG_OTP=1 to print codes to the server log (not on Vercel production).",
      500,
    );
  }
  const env = smsEnv();
  const body = new URLSearchParams({ username: env.AT_USERNAME, to, message });
  if (env.AT_SENDER_ID) body.set("from", env.AT_SENDER_ID);

  const res = await fetch(env.AT_USERNAME === "sandbox" ? SANDBOX_URL : LIVE_URL, {
    method: "POST",
    headers: {
      apiKey: env.AT_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json().catch(() => ({}))) as {
    SMSMessageData?: { Message?: string; Recipients?: { status?: string; statusCode?: number; messageId?: string }[] };
  };
  const recipient = json.SMSMessageData?.Recipients?.[0];
  // statusCode 100 Processed, 101 Sent, 102 Queued. Anything else did not go out.
  if (!res.ok || !recipient || ![100, 101, 102].includes(recipient.statusCode ?? 0)) {
    throw new SmsError(recipient?.status ?? json.SMSMessageData?.Message ?? `Africa's Talking responded ${res.status}`, res.status);
  }
  return recipient.messageId ?? "";
}

export function otpMessage(code: string): string {
  return `Your Korope code is ${code}. It expires in 5 minutes. Never share it.`;
}
