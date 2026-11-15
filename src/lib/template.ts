/*
FILE:      src/lib/template.ts
CREATED:   2026-11-15 10:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      OTP SMS text in English (ASCII, 1 part of 160) and Arabic (UCS-2, 1 part of 70).
WHY:       Cost is 1 credit per part; a longer or non-GSM text silently multiplies the bill.
*/

import { cleanMessage } from "kwtsms";

export type Lang = "en" | "ar";

export function pickLang(value: string | null | undefined): Lang {
  return value === "ar" ? "ar" : "en";
}

/** Keep the app name short and ASCII-safe so the message stays one part. */
export function safeAppName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "").trim().slice(0, 16) || "App";
}

export function buildOtpMessage(lang: Lang, appName: string, code: string): string {
  const app = safeAppName(appName);
  const text =
    lang === "ar"
      ? `${app}: رمز التحقق ${code}. صالح 5 دقائق. لا تشاركه.`
      : `${app}: your code is ${code}. Valid 5 min. Do not share it.`;
  return cleanMessage(text);
}

/** SMS parts for this text: 160/153 chars for GSM-7 ASCII, 70/67 for Arabic (UCS-2). */
export function smsParts(text: string): number {
  const unicode = /[^\x00-\x7f]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const len = Array.from(text).length;
  return len <= single ? 1 : Math.ceil(len / multi);
}
