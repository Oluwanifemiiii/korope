import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const rateLimit = vi.fn();
vi.mock("@/lib/supabase/service", () => ({ rateLimit: (...a: unknown[]) => rateLimit(...a) }));

const SECRET_B64 = Buffer.from("korope-test-secret-korope-test-secret").toString("base64");

function signed(body: object, secret = SECRET_B64) {
  const raw = JSON.stringify(body);
  const id = "msg_1";
  const ts = new Date();
  const signature = new Webhook(secret).sign(id, ts, raw);
  return new Request("http://localhost/api/auth/sms-hook", {
    method: "POST",
    body: raw,
    headers: {
      "webhook-id": id,
      "webhook-timestamp": String(Math.floor(ts.getTime() / 1000)),
      "webhook-signature": signature,
    },
  });
}

const payload = { user: { id: "u1", phone: "2348034127765" }, sms: { otp: "481092" } };

describe("POST /api/auth/sms-hook", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("SEND_SMS_HOOK_SECRET", `v1,whsec_${SECRET_B64}`);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key-for-tests");
    vi.stubEnv("TERMII_API_KEY", "termii-test-key");
    vi.stubEnv("TERMII_SENDER_ID", "Korope");
    vi.stubGlobal("fetch", fetchMock);
    rateLimit.mockResolvedValue(true);
    fetchMock.mockResolvedValue(Response.json({ message_id: "m1" }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("sends the OTP through Termii's DND route", async () => {
    const { POST } = await import("./route");
    const res = await POST(signed(payload));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://v3.api.termii.com/api/sms/send");
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ to: "2348034127765", from: "Korope", channel: "dnd" });
    expect(sent.sms).toContain("481092");
    expect(sent.sms).not.toMatch(/—/);
    expect(rateLimit).toHaveBeenCalledWith("otp:phone:2348034127765", 3, 600);
  });

  it("rejects a bad signature without sending", async () => {
    const { POST } = await import("./route");
    const res = await POST(signed(payload, Buffer.from("wrong-secret-wrong-secret-wrong").toString("base64")));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses once the phone hits its limit", async () => {
    rateLimit.mockResolvedValue(false);
    const { POST } = await import("./route");
    const res = await POST(signed(payload));
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a Termii failure so Supabase shows an error", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Insufficient balance" }, { status: 400 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("./route");
    const res = await POST(signed(payload));
    expect(res.status).toBe(502);
    expect((await res.json()).error.http_code).toBe(502);
  });
});
