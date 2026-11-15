/*
FILE:      src/lib/limits.ts
CREATED:   2026-11-15 10:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Abuse limits for the OTP send path, counted in the database.
WHY:       Vercel functions are stateless, so in-memory counters would not hold; limits must survive across instances.
*/

import type { Limits } from "./config";

/**
 * One fixed-window counter. hit() returns false when the counter is already at max,
 * otherwise it consumes one and returns true. Implementations must make that atomic.
 */
export interface LimitStore {
  hit(key: string, windowSec: number, max: number, nowSec: number): Promise<boolean>;
}

export type LimitReason = "COOLDOWN" | "LIMIT";

/**
 * Checks, in order: resend cooldown, per-number hourly, per-number daily, global daily.
 * A later limit failing leaves the earlier counts consumed (conservative, fail-closed).
 * A max of 0 blocks everything (kill switch for the global cap).
 */
export async function checkSendLimits(
  store: LimitStore,
  limits: Limits,
  phoneDigits: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): Promise<{ ok: true } | { ok: false; reason: LimitReason }> {
  const steps: Array<[string, number, number, LimitReason]> = [
    [`cd:${phoneDigits}`, limits.cooldownSec, 1, "COOLDOWN"],
    [`ph:${phoneDigits}`, 3600, limits.perPhoneHour, "LIMIT"],
    [`pd:${phoneDigits}`, 86400, limits.perPhoneDay, "LIMIT"],
    ["global:day", 86400, limits.globalDay, "LIMIT"],
  ];
  for (const [key, windowSec, max, reason] of steps) {
    if (windowSec === 0) continue; // cooldown disabled
    if (max === 0 || !(await store.hit(key, windowSec, max, nowSec))) return { ok: false, reason };
  }
  return { ok: true };
}

/** In-memory store for unit tests. */
export function createMemoryStore(): LimitStore {
  const rows = new Map<string, { count: number; start: number }>();
  return {
    async hit(key, windowSec, max, nowSec) {
      let row = rows.get(key);
      if (!row || nowSec - row.start >= windowSec) {
        row = { count: 0, start: nowSec };
        rows.set(key, row);
      }
      if (row.count >= max) return false;
      row.count += 1;
      return true;
    },
  };
}
