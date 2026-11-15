/*
FILE:      tests/unit/contract.test.ts
CREATED:   2026-11-15 10:32 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Contract test against the real Better Auth phone-number plugin (in-memory SQLite, fake SMS client).
WHY:       A Better Auth upgrade that changes the sendOTP shape or the guard hooks must break CI, not users.
*/

import { readFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { beforeAll, describe, expect, it } from "vitest";
import { authOptions, makeSendOtp } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { type SmsClient, setSmsClient } from "@/lib/sms";

const cfg = loadConfig({
  KWTSMS_USERNAME: "test_user",
  KWTSMS_PASSWORD: "test_pass",
  OTP_COOLDOWN_SECONDS: "60",
});

const sent: Array<{ mobile: string; message: string }> = [];
const fake: SmsClient = {
  async send(mobile, message) {
    sent.push({ mobile, message });
    return { result: "OK" };
  },
};

function build() {
  const db = new (process.getBuiltinModule("node:sqlite").DatabaseSync)(":memory:");
  const opts = authOptions(cfg, db);
  // next/server after() only works inside a request; await the send in this test.
  return { ...opts, advanced: { ipAddress: opts.advanced.ipAddress } };
}

type Call = (a: { body: Record<string, string>; headers?: Headers }) => Promise<{ status: boolean; user: { phoneNumber: string; email: string } }>;
type Api = { sendPhoneNumberOTP: Call; verifyPhoneNumber: Call };

describe("Better Auth phone-number contract", () => {
  let api: Api;
  beforeAll(async () => {
    setSmsClient(fake);
    const opts = build();
    await (await getMigrations(opts)).runMigrations();
    api = betterAuth(opts).api as unknown as Api;
  });

  it.skipIf(process.env.CONTRACT_PIN === "off")("is pinned to the tested Better Auth version", () => {
    const pkg = JSON.parse(readFileSync("node_modules/better-auth/package.json", "utf8"));
    expect(pkg.version).toBe("1.7.25");
  });

  it("sendOTP receives { phoneNumber, code } and an Arabic request gets the Arabic text", async () => {
    await api.sendPhoneNumberOTP({ body: { phoneNumber: "50000000" }, headers: new Headers({ "x-otp-lang": "ar" }) });
    expect(sent).toHaveLength(1);
    expect(sent[0].mobile).toBe("96550000000");
    expect(sent[0].message).toMatch(/\d{6}/);
    expect(sent[0].message).toContain("رمز التحقق");
  });

  it("the code in the SMS verifies and creates the user with a temp email", async () => {
    const code = sent[0].message.match(/\d{6}/)![0];
    const bad = api.verifyPhoneNumber({ body: { phoneNumber: "50000000", code: "000000" } });
    await expect(bad).rejects.toThrow();
    const res = await api.verifyPhoneNumber({ body: { phoneNumber: "+965 5000 0000", code } });
    expect(res.status).toBe(true);
    expect(res.user.phoneNumber).toBe("+96550000000");
    expect(res.user.email).toBe("96550000000@phone.invalid");
  });

  it("resend within the cooldown is refused and nothing is sent", async () => {
    const before = sent.length;
    await expect(api.sendPhoneNumberOTP({ body: { phoneNumber: "50000000" } })).rejects.toMatchObject({
      body: { code: "COOLDOWN" },
    });
    expect(sent.length).toBe(before);
  });

  it("a non-allowed country and a bad number are refused with a code", async () => {
    await expect(api.sendPhoneNumberOTP({ body: { phoneNumber: "+447911123456" } })).rejects.toMatchObject({
      body: { code: "COUNTRY_NOT_ALLOWED" },
    });
    await expect(api.sendPhoneNumberOTP({ body: { phoneNumber: "12" } })).rejects.toMatchObject({
      body: { code: "INVALID_PHONE" },
    });
  });

  it("makeSendOtp has the (data, ctx) shape and never throws on client failure", async () => {
    setSmsClient({ send: async () => ({ result: "ERROR", code: "ERR003" }) });
    await expect(makeSendOtp(cfg)({ phoneNumber: "+96550000000", code: "123456" }, null)).resolves.toBeUndefined();
    setSmsClient({ send: async () => { throw new Error("network"); } });
    await expect(makeSendOtp(cfg)({ phoneNumber: "+96550000000", code: "123456" }, null)).resolves.toBeUndefined();
  });
});
