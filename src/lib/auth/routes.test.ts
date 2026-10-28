import { describe, expect, it } from "vitest";
import { requiredRole, safeNext } from "./routes";

describe("requiredRole", () => {
  it.each([
    ["/", null],
    ["/sign-in", null],
    ["/terms", null],
    ["/t/abc123", null],
    ["/search", null],
    ["/stops/chevron", null],
    ["/api/paystack/webhook", null],
    ["/auth/callback", null],
    ["/driver/sign-in", null],
    ["/trips", "passenger"],
    ["/wallet", "passenger"],
    ["/trip/123/pass", "passenger"],
    ["/driver", "driver"],
    ["/driver/manifest", "driver"],
    ["/ops", "ops_admin"],
    ["/ops/routes/1", "ops_admin"],
    ["/opsx", "passenger"],
  ])("%s needs %s", (path, role) => {
    expect(requiredRole(path)).toBe(role);
  });
});

describe("safeNext", () => {
  it("keeps relative paths and drops anything off-site", () => {
    expect(safeNext("/wallet")).toBe("/wallet");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext(null, "/driver")).toBe("/driver");
  });
});
