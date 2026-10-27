import { z } from "zod";

/**
 * Nigerian mobile number as typed on 03a: "803 412 7765", "0803...", "+234 803...".
 * Normalised to E.164 with the plus, which is what Supabase Auth expects.
 */
export const nigerianPhone = z
  .string()
  .transform((raw) => raw.replace(/\D/g, ""))
  .transform((d) => (d.startsWith("234") ? d.slice(3) : d.startsWith("0") ? d.slice(1) : d))
  .refine((d) => /^[789]\d{9}$/.test(d), {
    message: "That number looks short. Nigerian numbers have 10 digits after +234.",
  })
  .transform((d) => `+234${d}`);

export const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code from the SMS.");

/** Payload of Supabase's Send SMS hook. */
export const sendSmsHookPayload = z.object({
  user: z.object({ id: z.string(), phone: z.string().min(8) }),
  sms: z.object({ otp: z.string().min(4) }),
});

/** "+234 803 412 7765" for display. */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^234/, "");
  return `+234 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
