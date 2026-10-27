import { z } from "zod";

/**
 * Environment variables, validated on first use rather than at import so builds
 * and tests that don't touch a service don't need its secrets. See .env.example.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SEND_SMS_HOOK_SECRET: z.string().startsWith("v1,whsec_"),
  TERMII_API_KEY: z.string().min(10),
  TERMII_BASE_URL: z.url().default("https://v3.api.termii.com"),
  TERMII_SENDER_ID: z.string().min(3).max(11),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

export function publicEnv(): PublicEnv {
  return publicSchema.parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function serverEnv(): ServerEnv {
  return serverSchema.parse(process.env);
}
