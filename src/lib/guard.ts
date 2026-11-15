/*
FILE:      src/lib/guard.ts
CREATED:   2026-11-15 10:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Better Auth plugin: phone normalization, country allowlist, DB-backed send limits, demo-code response.
WHY:       Abuse controls must sit in front of Better Auth's own endpoints, so the raw /api/auth routes are protected too, not just our UI.
*/

import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import type { AppConfig } from "./config";
import { checkSendLimits, type LimitStore } from "./limits";
import { normalizePhone } from "./phone";
import { demoCodes } from "./sms";

const SEND = "/phone-number/send-otp";
const VERIFY = "/phone-number/verify";

interface LimitRow {
  key: string;
  count: number;
  windowStart: number;
}

type Adapter = {
  findOne<T>(a: { model: string; where: Array<Record<string, unknown>> }): Promise<T | null>;
  create(a: { model: string; data: Record<string, unknown> }): Promise<unknown>;
  update(a: { model: string; where: Array<Record<string, unknown>>; update: Record<string, unknown> }): Promise<unknown>;
  incrementOne<T>(a: {
    model: string;
    where: Array<Record<string, unknown>>;
    increment: Record<string, number>;
  }): Promise<T | null>;
};

/** Database counter. The guarded incrementOne (count < max) is the atomic check-and-consume. */
export function createAdapterStore(adapter: Adapter): LimitStore {
  const model = "otpLimit";
  return {
    async hit(key, windowSec, max, nowSec) {
      const where = [{ field: "key", value: key }];
      const row = await adapter.findOne<LimitRow>({ model, where });
      if (!row) {
        try {
          await adapter.create({ model, data: { key, count: 0, windowStart: nowSec } });
        } catch {
          // A parallel request created the row first (unique key). Fine.
        }
      } else if (nowSec - Number(row.windowStart) >= windowSec) {
        await adapter.update({ model, where, update: { count: 0, windowStart: nowSec } });
      }
      const hit = await adapter.incrementOne<LimitRow>({
        model,
        where: [...where, { field: "count", operator: "lt", value: max }],
        increment: { count: 1 },
      });
      return hit !== null;
    },
  };
}

function reject(status: "BAD_REQUEST" | "TOO_MANY_REQUESTS", code: string, message: string): never {
  throw new APIError(status, { code, message });
}

export function otpGuard(cfg: AppConfig): BetterAuthPlugin {
  return {
    id: "otp-guard",
    schema: {
      otpLimit: {
        fields: {
          key: { type: "string", required: true, unique: true },
          count: { type: "number", required: true },
          windowStart: { type: "number", required: true, bigint: true },
        },
      },
    },
    hooks: {
      before: [
        {
          matcher: (ctx) => ctx.path === SEND || ctx.path === VERIFY,
          handler: createAuthMiddleware(async (ctx) => {
            const body = (ctx.body ?? {}) as { phoneNumber?: string };
            const phone = normalizePhone(body.phoneNumber ?? "", cfg.allowedCountries);
            if (!phone.ok) reject("BAD_REQUEST", phone.reason, phone.reason);
            if (ctx.path === SEND) {
              const store = createAdapterStore(ctx.context.adapter as unknown as Adapter);
              const res = await checkSendLimits(store, cfg.limits, phone.digits);
              if (!res.ok) reject("TOO_MANY_REQUESTS", res.reason, res.reason);
            }
            return { context: { body: { ...body, phoneNumber: phone.e164 } } };
          }),
        },
      ],
      after: [
        {
          // Demo mode only: hand the code back so the screen can show it. Never registered otherwise.
          matcher: (ctx) => cfg.mode === "demo" && ctx.path === SEND,
          handler: createAuthMiddleware(async (ctx) => {
            if (ctx.context.returned instanceof Error) return;
            const digits = String((ctx.body as { phoneNumber?: string }).phoneNumber ?? "").replace(/\D/g, "");
            const code = demoCodes().get(digits);
            demoCodes().delete(digits);
            return ctx.json({ message: "code sent", demoCode: code ?? null });
          }),
        },
      ],
    },
  };
}
