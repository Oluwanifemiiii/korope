import { describe, expect, it } from "vitest";
import { formatPhone, nigerianPhone, otpCode } from "./auth";

describe("nigerianPhone", () => {
  it.each([
    ["803 412 7765", "+2348034127765"],
    ["08034127765", "+2348034127765"],
    ["+234 803 412 7765", "+2348034127765"],
    ["2349012345678", "+2349012345678"],
    ["7012345678", "+2347012345678"],
  ])("accepts %s", (input, want) => {
    expect(nigerianPhone.parse(input)).toBe(want);
  });

  it.each(["803 412 776", "6034127765", "", "abc"])("rejects %s with the design copy", (input) => {
    const r = nigerianPhone.safeParse(input);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe(
      "That number looks short. Nigerian numbers have 10 digits after +234.",
    );
  });
});

describe("otpCode", () => {
  it("accepts six digits only", () => {
    expect(otpCode.safeParse("481092").success).toBe(true);
    expect(otpCode.safeParse("48109").success).toBe(false);
    expect(otpCode.safeParse("48109a").success).toBe(false);
  });
});

describe("formatPhone", () => {
  it("groups the number like the OTP screen", () => {
    expect(formatPhone("+2348034127765")).toBe("+234 803 412 7765");
    expect(formatPhone("2348034127765")).toBe("+234 803 412 7765");
  });
});
