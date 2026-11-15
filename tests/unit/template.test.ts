/*
FILE:      tests/unit/template.test.ts
CREATED:   2026-11-15 10:33 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Unit tests: OTP message text stays one SMS part in English and Arabic.
WHY:       1 credit per part; EN 160 and AR 70 characters is the cost promise in the README.
*/

import { describe, expect, it } from "vitest";
import { buildOtpMessage, safeAppName, smsParts } from "@/lib/template";

describe("OTP template", () => {
  it("English is pure ASCII and one part, even with the longest app name", () => {
    const m = buildOtpMessage("en", "A".repeat(40), "123456");
    expect(m).toMatch(/^[\x20-\x7e]+$/);
    expect(m).toContain("123456");
    expect(smsParts(m)).toBe(1);
  });
  it("Arabic is one part (<= 70 chars) with the longest app name", () => {
    const m = buildOtpMessage("ar", "A".repeat(40), "123456");
    expect(m).toContain("123456");
    expect(Array.from(m).length).toBeLessThanOrEqual(70);
    expect(smsParts(m)).toBe(1);
  });
  it("part counting boundaries", () => {
    expect(smsParts("a".repeat(160))).toBe(1);
    expect(smsParts("a".repeat(161))).toBe(2);
    expect(smsParts("ع".repeat(70))).toBe(1);
    expect(smsParts("ع".repeat(71))).toBe(2);
  });
  it("app name is stripped to ASCII and capped", () => {
    expect(safeAppName("Caf\u00e9 \u2014 Shop")).toBe("Caf  Shop");
    expect(safeAppName("متجر")).toBe("App");
  });
  it("uses no dash, smart quote or ellipsis characters", () => {
    for (const lang of ["en", "ar"] as const) {
      expect(buildOtpMessage(lang, "kwtSMS Demo", "123456")).not.toMatch(/[\u2013\u2014\u2018\u2019\u201c\u201d\u2026]/);
    }
  });
});
