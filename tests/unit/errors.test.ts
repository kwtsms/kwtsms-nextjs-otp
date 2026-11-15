/*
FILE:      tests/unit/errors.test.ts
CREATED:   2026-11-15 10:28 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Unit tests: ERR code classes and log lines.
WHY:       Operators rely on the log line; it must name the code and never contain secrets.
*/

import { describe, expect, it } from "vitest";
import { classifyError, describeSendError } from "@/lib/errors";

describe("ERR map", () => {
  it("classifies known codes", () => {
    expect(classifyError("ERR003")).toBe("config");
    expect(classifyError("ERR010")).toBe("balance");
    expect(classifyError("ERR028")).toBe("transient");
    expect(classifyError("ERR025")).toBe("input");
    expect(classifyError("NETWORK")).toBe("transient");
  });
  it("falls back to unknown", () => {
    expect(classifyError("ERR999")).toBe("unknown");
    expect(classifyError(undefined)).toBe("unknown");
  });
  it("describes with the API text", () => {
    expect(describeSendError("ERR003")).toMatch(/^ERR003 \[config\] Wrong API username or password/);
  });
  it("handles a missing code", () => {
    expect(describeSendError(undefined, "boom")).toBe("NO_CODE [unknown] boom");
  });
});
