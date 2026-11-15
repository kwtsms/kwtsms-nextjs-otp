/*
FILE:      src/lib/sms.ts
CREATED:   2026-11-15 10:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      SMS client interface plus the kwtSMS, demo and fake implementations, and deliverOtp().
WHY:       Everything that can send is behind one interface so tests inject a fake and demo mode never touches the network.
*/

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { KwtSMS, maskPhone } from "kwtsms";
import type { AppConfig } from "./config";
import { describeSendError } from "./errors";
import { buildOtpMessage, type Lang } from "./template";

export interface SendOutcome {
  result: string;
  code?: string;
  description?: string;
}

export interface SmsClient {
  send(mobile: string, message: string): Promise<SendOutcome>;
}

/** Real client. test=1 unless live. logFile is disabled: the library would log message text (the code). */
export function createKwtClient(cfg: AppConfig): SmsClient {
  const kwt = new KwtSMS(cfg.username, cfg.password, {
    senderId: cfg.senderId,
    testMode: cfg.mode !== "live",
    logFile: "",
    appName: "kwtsms-nextjs-otp",
  });
  return {
    async send(mobile, message) {
      const r = await kwt.send(mobile, message);
      return { result: r.result, code: r.code, description: r.description };
    },
  };
}

/** Test double: appends one JSON line per message to a file the E2E test reads. */
export function createFakeClient(outbox: string): SmsClient {
  mkdirSync(dirname(outbox), { recursive: true });
  return {
    async send(mobile, message) {
      appendFileSync(outbox, JSON.stringify({ mobile, message, at: Date.now() }) + "\n");
      return { result: "OK" };
    },
  };
}

// Demo mode: the code never leaves the server except through the demo response (see guard plugin).
const demoStore = globalThis as unknown as { __kwtDemoCodes?: Map<string, string> };
export function demoCodes(): Map<string, string> {
  demoStore.__kwtDemoCodes ??= new Map();
  return demoStore.__kwtDemoCodes;
}

let override: SmsClient | undefined;
/** Tests inject a client here. */
export function setSmsClient(client: SmsClient | undefined): void {
  override = client;
}

let built: SmsClient | undefined;
export function getSmsClient(cfg: AppConfig): SmsClient | null {
  if (override) return override;
  if (cfg.mode === "demo") return null;
  if (cfg.fakeOutbox) return (built ??= createFakeClient(cfg.fakeOutbox));
  return (built ??= createKwtClient(cfg));
}

/** Never throws and never logs the code outside demo mode. The caller always answers "code sent". */
export async function deliverOtp(
  cfg: AppConfig,
  phoneDigits: string,
  code: string,
  lang: Lang,
  client: SmsClient | null = getSmsClient(cfg),
): Promise<void> {
  try {
    if (!client) {
      demoCodes().set(phoneDigits, code);
      console.info(`[kwtsms-otp] DEMO: no SMS sent. Code for ${maskPhone(phoneDigits)} is ${code}`);
      return;
    }
    const res = await client.send(phoneDigits, buildOtpMessage(lang, cfg.appName, code));
    if (res.result !== "OK") {
      console.error(`[kwtsms-otp] send failed: ${describeSendError(res.code, res.description)}`);
    }
  } catch (e) {
    console.error(`[kwtsms-otp] send threw: ${e instanceof Error ? e.message : "unknown"}`);
  }
}
