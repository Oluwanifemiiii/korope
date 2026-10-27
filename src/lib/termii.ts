import "server-only";
import { serverEnv } from "@/lib/env";

export class TermiiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Sends one SMS through Termii. OTPs use the DND route, because many Lagos numbers
 * are on Do-Not-Disturb and the generic route silently drops to them.
 * `to` is E.164 digits without the plus (2348034127765).
 */
export async function sendSms(to: string, message: string, { timeoutMs = 8000 } = {}) {
  const env = serverEnv();
  const res = await fetch(new URL("/api/sms/send", env.TERMII_BASE_URL), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      api_key: env.TERMII_API_KEY,
      to,
      from: env.TERMII_SENDER_ID,
      sms: message,
      type: "plain",
      channel: "dnd",
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = (await res.json().catch(() => ({}))) as { message_id?: string; message?: string };
  if (!res.ok || !body.message_id) {
    throw new TermiiError(body.message ?? `Termii responded ${res.status}`, res.status);
  }
  return body.message_id;
}
