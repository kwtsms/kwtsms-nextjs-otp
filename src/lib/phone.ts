/*
FILE:      src/lib/phone.ts
CREATED:   2026-11-15 10:30 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Normalizes phone input (Arabic/Persian digits, +965 default) and applies the country allowlist.
WHY:       Kuwait users type 8-digit local numbers in either digit set; non-allowed countries must be refused before any SMS is queued.
*/

import { toAsciiDigits } from "./digits";
import { findCountryCode, validatePhoneInput } from "kwtsms";

export type PhoneResult =
  | { ok: true; digits: string; e164: string; country: string }
  | { ok: false; reason: "INVALID_PHONE" | "COUNTRY_NOT_ALLOWED" };

export function normalizePhone(raw: string, allowedCountries: string[]): PhoneResult {
  const ascii = toAsciiDigits(String(raw ?? "")).trim();
  if (ascii === "" || ascii.length > 25 || !/^[+\d\s().-]+$/.test(ascii)) {
    return { ok: false, reason: "INVALID_PHONE" };
  }
  let digits = ascii.replace(/\D/g, "");
  // 8-digit local Kuwait number without a country code.
  if (digits.length === 8 && !ascii.startsWith("+") && !ascii.startsWith("00")) {
    digits = `965${digits}`;
  }
  const [valid, , normalized] = validatePhoneInput(digits);
  if (!valid) return { ok: false, reason: "INVALID_PHONE" };
  const country = findCountryCode(normalized);
  if (!country || !allowedCountries.includes(country)) {
    return { ok: false, reason: "COUNTRY_NOT_ALLOWED" };
  }
  return { ok: true, digits: normalized, e164: `+${normalized}`, country };
}
