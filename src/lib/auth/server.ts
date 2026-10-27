import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { phoneNumber } from "better-auth/plugins";
import { headers } from "next/headers";
import { asService, pool, rateLimit } from "@/lib/db";
import { serverEnv } from "@/lib/env";
import { otpMessage, sendSms } from "@/lib/sms";
import type { AppRole } from "./routes";

const env = serverEnv();
const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : undefined;

/**
 * Self-hosted Better Auth on Neon (D-025). Phone OTP is the primary sign-in and also
 * signs people up on first verification; Google is secondary. Tables are the auth_*
 * tables from db/migrations/0001_foundation.sql.
 */
export const auth = betterAuth({
  database: pool(),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_SITE_URL,
  advanced: { database: { generateId: "uuid" } },
  user: { modelName: "auth_user" },
  session: {
    modelName: "auth_session",
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Lets proxy.ts and layouts read the session without a DB hit for 5 minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  account: { modelName: "auth_account" },
  verification: { modelName: "auth_verification" },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "auth_rate_limit",
    customRules: {
      "/phone-number/send-otp": { window: 600, max: 3 },
      "/phone-number/verify": { window: 600, max: 10 },
    },
  },
  socialProviders: google,
  plugins: [
    phoneNumber({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      phoneNumberValidator: (p) => /^\+234[789]\d{9}$/.test(p),
      async sendOTP({ phoneNumber: to, code }) {
        // Per-phone cap on top of Better Auth's per-IP limit: 3 codes per 10 minutes.
        if (!(await rateLimit(`otp:phone:${to}`, 3, 600))) {
          throw new Error("Too many codes requested for this number");
        }
        await sendSms(to, otpMessage(code));
      },
      signUpOnVerification: {
        // Better Auth needs an email per user; phone-first accounts get a placeholder.
        getTempEmail: (p) => `${p.replace(/\D/g, "")}@phone.korope.app`,
        getTempName: (p) => p,
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Current session in a Server Component, Server Action or route handler, or null. */
export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({ headers: await headers() });
}

/** Roles straight from user_roles (not cached), for layouts that gate /driver and /ops. */
export async function getRoles(userId: string): Promise<AppRole[]> {
  return asService(async (c) => {
    const { rows } = await c.query<{ roles: AppRole[] }>("select private.user_roles_of($1)::text[] as roles", [userId]);
    return rows[0]?.roles ?? [];
  });
}
