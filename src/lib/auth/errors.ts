/**
 * Sign-in error copy. Never blames the user, says what to do next.
 * Better Auth error codes come from the phone-number plugin and the rate limiter.
 */
export function authErrorMessage(err: { code?: string; status?: number; message?: string } | null): string {
  if (!err) return "Something went wrong on our side. Try again in a moment.";
  switch (err.code) {
    case "OTP_EXPIRED":
      return "That code has expired. We can send you a new one.";
    case "INVALID_OTP":
    case "OTP_NOT_FOUND":
      return "That code didn't match. Check the latest SMS or request a new one.";
    case "TOO_MANY_ATTEMPTS":
      return "That code was entered wrongly too many times. Request a new one.";
    case "INVALID_PHONE_NUMBER":
      return "That number looks short. Nigerian numbers have 10 digits after +234.";
  }
  if (err.status === 429) return "You've asked for a few codes already. Wait a few minutes and try again.";
  if (err.status && err.status >= 500) return "We couldn't send the SMS just now. Try again in a moment.";
  return "Something went wrong on our side. Try again in a moment.";
}
