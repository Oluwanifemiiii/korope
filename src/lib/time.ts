/**
 * All user-facing times are Africa/Lagos (UTC+1, no DST).
 * Design uses 7:15 for mornings and 17:45 style 24-hour times elsewhere,
 * so we format as 24-hour without a leading zero on the hour.
 */
export const LAGOS_TZ = "Africa/Lagos";

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LAGOS_TZ,
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LAGOS_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LAGOS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

type DateInput = Date | string | number;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

/** "7:15", "17:45" */
export function formatTime(d: DateInput): string {
  return timeFmt.format(toDate(d));
}

/** "Mon 26 Oct" */
export function formatDay(d: DateInput): string {
  return dayFmt.format(toDate(d)).replace(",", "");
}

/** "Mon 26 Oct · 17:45" */
export function formatDayTime(d: DateInput): string {
  return `${formatDay(d)} · ${formatTime(d)}`;
}

/** Hour of day in Lagos, 0 to 23. */
export function lagosHour(d: DateInput = new Date()): number {
  const hour = partsFmt.formatToParts(toDate(d)).find((p) => p.type === "hour")?.value;
  return Number(hour);
}

/** "2026-10-27" in Lagos time, the service date for a departure. */
export function lagosDate(d: DateInput = new Date()): string {
  const p = Object.fromEntries(partsFmt.formatToParts(toDate(d)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Greeting used on Home (05a). */
export function greeting(d: DateInput = new Date()): "Good morning" | "Good afternoon" | "Good evening" {
  const h = lagosHour(d);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Night map style applies 18:30 to 06:00 Lagos time (B08). */
export function isNightInLagos(d: DateInput = new Date()): boolean {
  const date = toDate(d);
  const h = lagosHour(date);
  const m = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: LAGOS_TZ, minute: "2-digit" }).format(date),
  );
  const minutes = h * 60 + m;
  return minutes >= 18 * 60 + 30 || minutes < 6 * 60;
}

/** "0:42", "4:58" for hold timers and resend countdowns. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
