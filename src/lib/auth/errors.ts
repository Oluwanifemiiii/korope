/**
 * Sign-in error copy. Never blames the user, says what to do next.
 * Supabase Auth error codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
export function authErrorMessage(err: { code?: string; status?: number; message?: string } | null): string {
  if (!err) return "Something went wrong on our side. Try again in a moment.";
  switch (err.code) {
    case "otp_expired":
      return "That code has expired. We can send you a new one.";
    case "invalid_credentials":
    case "otp_disabled":
      return "That code didn't match. Check the latest SMS or request a new one.";
    case "over_sms_send_rate_limit":
    case "over_request_rate_limit":
    case "too_many_requests":
      return "You've asked for a few codes already. Wait a few minutes and try again.";
    case "sms_send_failed":
    case "hook_timeout":
    case "unexpected_failure":
      return "We couldn't send the SMS just now. Try again in a moment.";
    case "phone_provider_disabled":
      return "Phone sign-in is not available right now. Try Continue with Google.";
  }
  if (err.status === 429) return "You've asked for a few codes already. Wait a few minutes and try again.";
  if (err.message?.toLowerCase().includes("token")) {
    return "That code didn't match. Check the latest SMS or request a new one.";
  }
  return "Something went wrong on our side. Try again in a moment.";
}
