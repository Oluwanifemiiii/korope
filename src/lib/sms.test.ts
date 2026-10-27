import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ok = (statusCode = 101) =>
  Response.json({
    SMSMessageData: { Message: "Sent to 1/1", Recipients: [{ status: "Success", statusCode, messageId: "ATXid_1" }] },
  });

describe("sendSms (Africa's Talking)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AT_USERNAME", "korope");
    vi.stubEnv("AT_API_KEY", "atsk_test_key_123456");
    vi.stubEnv("AT_SENDER_ID", "Korope");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(ok());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("posts to the live endpoint with the sender ID and API key", async () => {
    const { sendSms, otpMessage } = await import("./sms");
    await expect(sendSms("+2348034127765", otpMessage("481092"))).resolves.toBe("ATXid_1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.africastalking.com/version1/messaging");
    expect(init.headers.apiKey).toBe("atsk_test_key_123456");
    const body = new URLSearchParams(init.body);
    expect(Object.fromEntries(body)).toMatchObject({ username: "korope", to: "+2348034127765", from: "Korope" });
    expect(body.get("message")).toContain("481092");
    expect(body.get("message")).not.toMatch(/—/);
  });

  it("uses the sandbox endpoint for the sandbox user", async () => {
    vi.stubEnv("AT_USERNAME", "sandbox");
    const { sendSms } = await import("./sms");
    await sendSms("+2348034127765", "hi");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.sandbox.africastalking.com/version1/messaging");
  });

  it("throws when the recipient was rejected, so the OTP request fails visibly", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ SMSMessageData: { Recipients: [{ status: "InsufficientBalance", statusCode: 405 }] } }),
    );
    const { sendSms, SmsError } = await import("./sms");
    await expect(sendSms("+2348034127765", "hi")).rejects.toBeInstanceOf(SmsError);
  });

  it("never logs codes instead of sending in production, even if the flag is set", async () => {
    vi.stubEnv("DEV_LOG_OTP", "1");
    const { sendSms } = await import("./sms");
    await sendSms("+2348034127765", "hi");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
