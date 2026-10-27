import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo } from "./money";

describe("formatNaira", () => {
  it("formats whole naira with comma thousands and no space", () => {
    expect(formatNaira(150_000)).toBe("₦1,500");
    expect(formatNaira(1_125_000)).toBe("₦11,250");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("shows kobo only when non-zero", () => {
    expect(formatNaira(150_050)).toBe("₦1,500.50");
    expect(formatNaira(5)).toBe("₦0.05");
  });

  it("uses a true minus for debits and optional plus for credits", () => {
    expect(formatNaira(-150_000)).toBe("−₦1,500");
    expect(formatNaira(500_000, { sign: "always" })).toBe("+₦5,000");
    expect(formatNaira(0, { sign: "always" })).toBe("₦0");
  });

  it("rejects non-integer kobo", () => {
    expect(() => formatNaira(1.5)).toThrow(TypeError);
  });
});

describe("nairaToKobo", () => {
  it("converts without float drift", () => {
    expect(nairaToKobo(1500)).toBe(150_000);
    expect(nairaToKobo(0.1 + 0.2)).toBe(30);
  });
});
