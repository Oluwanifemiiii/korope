import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/server";

// Better Auth endpoints: /api/auth/phone-number/send-otp, /phone-number/verify,
// /sign-in/social, /callback/google, /get-session, /sign-out, ...
export const { GET, POST } = toNextJsHandler(auth);
