/*
FILE:      tests/unit/phone.test.ts
CREATED:   2026-11-15 10:28 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Unit tests: phone normalization, digit sets, country allowlist.
WHY:       Kuwait input must work in every digit set and non-allowed countries must be refused.
*/

import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

const KW = ["965"];

describe("normalizePhone", () => {
  it("accepts 8-digit local numbers and adds 965", () => {
    const r = normalizePhone("50000000", KW);
    expect(r).toMatchObject({ ok: true, digits: "96550000000", e164: "+96550000000", country: "965" });
  });
  it("accepts +965, 00965 and spaced/dashed forms", () => {
    for (const v of ["+965 5000 0000", "00965-5000-0000", "965 50000000", "(965) 50000000"]) {
      expect(normalizePhone(v, KW)).toMatchObject({ ok: true, digits: "96550000000" });
    }
  });
  it("converts Arabic-Indic digits", () => {
    expect(normalizePhone("٥٠٠٠٠٠٠٠", KW)).toMatchObject({ ok: true, digits: "96550000000" });
  });
  it("converts Persian digits", () => {
    expect(normalizePhone("+۹۶۵۵۰۰۰۰۰۰۰", KW)).toMatchObject({ ok: true, digits: "96550000000" });
  });
  it("rejects garbage, letters, empty and email", () => {
    for (const v of ["", "abc", "5000 0000 x", "a@b.co", "1234"]) {
      expect(normalizePhone(v, KW)).toEqual({ ok: false, reason: "INVALID_PHONE" });
    }
  });
  it("rejects a Kuwait number starting with an impossible digit", () => {
    expect(normalizePhone("96500000000", KW)).toEqual({ ok: false, reason: "INVALID_PHONE" });
  });
  it("refuses a valid number of a non-allowed country", () => {
    expect(normalizePhone("+44 7911 123456", KW)).toEqual({ ok: false, reason: "COUNTRY_NOT_ALLOWED" });
  });
  it("empty allowlist denies everything", () => {
    expect(normalizePhone("50000000", [])).toEqual({ ok: false, reason: "COUNTRY_NOT_ALLOWED" });
  });
  it("allows an extra country when listed", () => {
    expect(normalizePhone("+44 7911 123456", ["965", "44"])).toMatchObject({ ok: true, country: "44" });
  });
});
