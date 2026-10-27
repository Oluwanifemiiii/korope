import { z } from "zod";

/**
 * Environment variables, validated on first use rather than at import so builds
 * and tests that don't touch a service don't need its secrets. See .env.example.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /** Neon pooled connection (app queries). */
  DATABASE_URL: z.string().startsWith("postgres"),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const smsSchema = z.object({
  /** "sandbox" uses Africa's Talking's simulator. */
  AT_USERNAME: z.string().min(1),
  AT_API_KEY: z.string().min(10),
  /** Registered alphanumeric sender ID; empty in sandbox. */
  AT_SENDER_ID: z.string().max(11).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type SmsEnv = z.infer<typeof smsSchema>;

export function serverEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}

export function smsEnv(): SmsEnv {
  return smsSchema.parse({
    AT_USERNAME: process.env.AT_USERNAME,
    AT_API_KEY: process.env.AT_API_KEY,
    AT_SENDER_ID: process.env.AT_SENDER_ID || undefined,
  });
}

/** Development only: log OTPs instead of sending SMS. Never honoured in production. */
export function shouldLogOtp(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOG_OTP === "1";
}
