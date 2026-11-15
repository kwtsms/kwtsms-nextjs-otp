/*
FILE:      src/lib/auth.ts
CREATED:   2026-11-15 10:50 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Builds the Better Auth instance: phone-number plugin, DB rate limits, background send.
WHY:       Single wiring point for the OTP flow; pinned Better Auth sendOTP signature is asserted by tests/unit/contract.test.ts.
*/

import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";
import { after } from "next/server";
import { type AppConfig, getConfig } from "./config";
import { getDatabase } from "./db";
import { otpGuard } from "./guard";
import { deliverOtp } from "./sms";
import { pickLang } from "./template";

/** Better Auth calls this as sendOTP({ phoneNumber, code }, ctx). Pinned by the contract test. */
export function makeSendOtp(cfg: AppConfig) {
  return async (
    { phoneNumber: phone, code }: { phoneNumber: string; code: string },
    ctx?: { headers?: Headers } | null,
  ): Promise<void> => {
    const lang = pickLang(ctx?.headers?.get("x-otp-lang"));
    await deliverOtp(cfg, phone.replace(/\D/g, ""), code, lang);
  };
}

export function authOptions(cfg: AppConfig, database: ReturnType<typeof getDatabase>) {
  return {
    appName: cfg.appName,
    secret: cfg.secret,
    baseURL: cfg.baseUrl,
    database,
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 3,
        sendOTP: makeSendOtp(cfg),
        // Temporary identity for first-time users: the account has no email. See README to add a profile step.
        signUpOnVerification: {
          getTempEmail: (p: string) => `${p.replace(/\D/g, "")}@phone.invalid`,
          getTempName: () => "Phone user",
        },
      }),
      otpGuard(cfg),
    ],
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      customRules: {
        "/phone-number/send-otp": { window: 3600, max: cfg.limits.perIpHour },
        "/phone-number/verify": { window: 600, max: cfg.limits.verifyPerIp10Min },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: [cfg.ipHeader] },
      // Demo awaits the send (the code is read back in the same response); real sends run after the response.
      ...(cfg.mode === "demo" ? {} : { backgroundTasks: { handler: (p: Promise<unknown>) => after(p) } }),
    },
  };
}

let instance: ReturnType<typeof create> | undefined;
function create() {
  const cfg = getConfig();
  return betterAuth(authOptions(cfg, getDatabase(cfg)));
}
export function getAuth() {
  return (instance ??= create());
}
