import { describe, expect, it } from "vitest";
import {
  relativeDay,
  formatCountdown,
  formatDayTime,
  formatTime,
  greeting,
  isNightInLagos,
  lagosDate,
} from "./time";

// 06:15 UTC is 07:15 in Lagos.
const morning = "2026-10-27T06:15:00Z";

describe("time in Africa/Lagos", () => {
  it("formats 24-hour times without a leading zero", () => {
    expect(formatTime(morning)).toBe("7:15");
    expect(formatTime("2026-10-26T16:45:00Z")).toBe("17:45");
  });

  it("formats day and time like the wallet history", () => {
    expect(formatDayTime("2026-10-26T16:45:00Z")).toBe("Mon 26 Oct · 17:45");
  });

  it("uses the Lagos date across UTC midnight", () => {
    expect(lagosDate("2026-10-27T23:30:00Z")).toBe("2026-10-28");
  });

  it("greets by Lagos hour", () => {
    expect(greeting(morning)).toBe("Good morning");
    expect(greeting("2026-10-27T13:00:00Z")).toBe("Good afternoon");
    expect(greeting("2026-10-27T18:00:00Z")).toBe("Good evening");
  });

  it("switches to night map between 18:30 and 06:00", () => {
    expect(isNightInLagos("2026-10-27T17:29:00Z")).toBe(false); // 18:29
    expect(isNightInLagos("2026-10-27T17:30:00Z")).toBe(true); // 18:30
    expect(isNightInLagos("2026-10-27T04:59:00Z")).toBe(true); // 05:59
    expect(isNightInLagos("2026-10-27T05:00:00Z")).toBe(false); // 06:00
  });

  it("labels days relative to Lagos today", () => {
    const now = "2026-10-28T12:00:00Z";
    expect(relativeDay("2026-10-28T17:00:00Z", now)).toBe("Today");
    expect(relativeDay("2026-10-29T05:15:00Z", now)).toBe("Tomorrow");
    expect(relativeDay("2026-10-28T23:30:00Z", now)).toBe("Tomorrow"); // 00:30 Lagos on the 29th
    expect(relativeDay("2026-10-30T05:15:00Z", now)).toBe("Fri 30 Oct");
  });

  it("formats countdowns", () => {
    expect(formatCountdown(42)).toBe("0:42");
    expect(formatCountdown(298)).toBe("4:58");
    expect(formatCountdown(-3)).toBe("0:00");
  });
});
