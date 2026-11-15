/*
FILE:      tests/unit/limits.test.ts
CREATED:   2026-11-15 11:15 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Unit tests: cooldown, per-number hourly/daily, global daily cap, kill switch.
WHY:       Abuse limits are the main cost protection; each rule must fail closed.
*/

import { describe, expect, it } from "vitest";
import { type Limits } from "@/lib/config";
import { checkSendLimits, createMemoryStore } from "@/lib/limits";

const base: Limits = { cooldownSec: 60, perPhoneHour: 3, perPhoneDay: 5, globalDay: 100, perIpHour: 10, verifyPerIp10Min: 30 };
const P = "96550000000";

describe("checkSendLimits", () => {
  it("allows the first send, then blocks on cooldown", async () => {
    const s = createMemoryStore();
    expect(await checkSendLimits(s, base, P, 1000)).toEqual({ ok: true });
    expect(await checkSendLimits(s, base, P, 1010)).toEqual({ ok: false, reason: "COOLDOWN" });
    expect(await checkSendLimits(s, base, P, 1061)).toEqual({ ok: true });
  });
  it("caps one number per hour", async () => {
    const s = createMemoryStore();
    const l = { ...base, cooldownSec: 1 };
    for (let i = 0; i < 3; i++) expect((await checkSendLimits(s, l, P, 1000 + i * 2)).ok).toBe(true);
    expect(await checkSendLimits(s, l, P, 1010)).toEqual({ ok: false, reason: "LIMIT" });
  });
  it("caps one number per day across hours", async () => {
    const s = createMemoryStore();
    const l = { ...base, cooldownSec: 1 };
    let t = 1000;
    let sent = 0;
    for (let h = 0; h < 4; h++) {
      for (let i = 0; i < 3; i++) {
        t = 1000 + h * 3700 + i * 2;
        if ((await checkSendLimits(s, l, P, t)).ok) sent++;
      }
    }
    expect(sent).toBe(5);
  });
  it("different numbers do not share per-number counters", async () => {
    const s = createMemoryStore();
    expect((await checkSendLimits(s, base, P, 1000)).ok).toBe(true);
    expect((await checkSendLimits(s, base, "96560000000", 1001)).ok).toBe(true);
  });
  it("global daily cap stops everyone", async () => {
    const s = createMemoryStore();
    const l = { ...base, globalDay: 2 };
    expect((await checkSendLimits(s, l, "96550000001", 1000)).ok).toBe(true);
    expect((await checkSendLimits(s, l, "96550000002", 1001)).ok).toBe(true);
    expect(await checkSendLimits(s, l, "96550000003", 1002)).toEqual({ ok: false, reason: "LIMIT" });
  });
  it("global cap of 0 is a kill switch", async () => {
    expect(await checkSendLimits(createMemoryStore(), { ...base, globalDay: 0 }, P, 1000)).toEqual({ ok: false, reason: "LIMIT" });
  });
  it("windows reset", async () => {
    const s = createMemoryStore();
    const l = { ...base, cooldownSec: 1, perPhoneHour: 1 };
    expect((await checkSendLimits(s, l, P, 1000)).ok).toBe(true);
    expect((await checkSendLimits(s, l, P, 2000)).ok).toBe(false);
    expect((await checkSendLimits(s, l, P, 1000 + 3600)).ok).toBe(true);
  });
});
