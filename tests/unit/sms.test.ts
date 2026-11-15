/*
FILE:      tests/unit/sms.test.ts
CREATED:   2026-11-15 11:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Unit tests: deliverOtp logging, demo mode, config modes and live-mode refusal.
WHY:       The OTP code and credentials must never reach logs outside demo; live must refuse weak settings.
*/

import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, loadConfig } from "@/lib/config";
import { demoCodes, deliverOtp } from "@/lib/sms";

afterEach(() => vi.restoreAllMocks());

describe("deliverOtp", () => {
  const cfg = loadConfig({ KWTSMS_USERNAME: "user_x", KWTSMS_PASSWORD: "pass_x" });

  it("logs the ERR code but never the OTP code, the password or the full number", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await deliverOtp(cfg, "96550000000", "654321", "en", { send: async () => ({ result: "ERROR", code: "ERR003" }) });
    const out = err.mock.calls.flat().join(" ");
    expect(out).toContain("ERR003");
    expect(out).not.toContain("654321");
    expect(out).not.toContain("pass_x");
    expect(out).not.toContain("96550000000");
  });

  it("a throwing client is swallowed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      deliverOtp(cfg, "96550000000", "654321", "en", { send: async () => { throw new Error("boom"); } }),
    ).resolves.toBeUndefined();
  });

  it("demo mode (no client) keeps the code in memory and prints it", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await deliverOtp(loadConfig({}), "96550000000", "111222", "en", null);
    expect(demoCodes().get("96550000000")).toBe("111222");
    expect(info.mock.calls.flat().join(" ")).toContain("no SMS sent");
  });
});

describe("modes and startup check", () => {
  it("no credentials = demo; credentials = test; KWTSMS_LIVE=1 = live", () => {
    expect(loadConfig({}).mode).toBe("demo");
    expect(loadConfig({ KWTSMS_USERNAME: "u", KWTSMS_PASSWORD: "p" }).mode).toBe("test");
    const live = {
      KWTSMS_USERNAME: "u", KWTSMS_PASSWORD: "p", KWTSMS_LIVE: "1",
      BETTER_AUTH_SECRET: "x".repeat(40), KWTSMS_SENDER_ID: "MyBrand",
    };
    expect(loadConfig(live).mode).toBe("live");
  });
  it("live refuses a short or placeholder secret, the shared sender, missing credentials, the fake outbox", () => {
    const ok = {
      KWTSMS_USERNAME: "u", KWTSMS_PASSWORD: "p", KWTSMS_LIVE: "1",
      BETTER_AUTH_SECRET: "x".repeat(40), KWTSMS_SENDER_ID: "MyBrand",
    };
    expect(() => loadConfig({ ...ok, BETTER_AUTH_SECRET: "short" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...ok, BETTER_AUTH_SECRET: "change-me-to-a-long-random-string-0000000" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...ok, KWTSMS_SENDER_ID: "KWT-SMS" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...ok, KWTSMS_SENDER_ID: "" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...ok, KWTSMS_USERNAME: "" })).toThrow(ConfigError);
    expect(() => loadConfig({ ...ok, KWTSMS_FAKE_OUTBOX: "/tmp/x" })).toThrow(ConfigError);
  });
  it("allowlist parsing: default 965, empty = none", () => {
    expect(loadConfig({}).allowedCountries).toEqual(["965"]);
    expect(loadConfig({ KWTSMS_ALLOWED_COUNTRIES: "" }).allowedCountries).toEqual([]);
    expect(loadConfig({ KWTSMS_ALLOWED_COUNTRIES: "965, 966,x" }).allowedCountries).toEqual(["965", "966"]);
  });
  it("rejects a non-numeric limit", () => {
    expect(() => loadConfig({ OTP_COOLDOWN_SECONDS: "abc" })).toThrow(ConfigError);
  });
});
