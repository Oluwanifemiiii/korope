/**
 * The only money formatter in the app. Amounts are always integer kobo.
 * Rules from the design (B05): "₦1,500" with no space, comma thousands,
 * and kobo shown only when non-zero ("₦1,500.50").
 */
export type Kobo = number;

const NAIRA = "₦";

export function formatNaira(kobo: Kobo, opts: { sign?: "auto" | "always" } = {}): string {
  if (!Number.isInteger(kobo)) {
    throw new TypeError(`formatNaira expects integer kobo, got ${kobo}`);
  }
  const negative = kobo < 0;
  const abs = Math.abs(kobo);
  const naira = Math.trunc(abs / 100);
  const rest = abs % 100;
  const whole = naira.toLocaleString("en-NG");
  const body = rest === 0 ? whole : `${whole}.${String(rest).padStart(2, "0")}`;
  // U+2212 minus, as used in the wallet history design.
  const sign = negative ? "−" : opts.sign === "always" && kobo > 0 ? "+" : "";
  return `${sign}${NAIRA}${body}`;
}

export function nairaToKobo(naira: number): Kobo {
  return Math.round(naira * 100);
}
