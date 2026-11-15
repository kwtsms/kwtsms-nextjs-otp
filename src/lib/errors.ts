/*
FILE:      src/lib/errors.ts
CREATED:   2026-11-15 10:30 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Maps kwtSMS ERR codes to a log class and a safe log line.
WHY:       Operators need to see why a send failed; users must never see it (generic response).
*/

import { API_ERRORS } from "kwtsms";

export type ErrorClass = "config" | "balance" | "transient" | "input" | "unknown";

const CLASSES: Record<string, ErrorClass> = {
  ERR001: "config",
  ERR002: "config",
  ERR003: "config",
  ERR004: "config",
  ERR005: "config",
  ERR008: "config",
  ERR024: "config",
  ERR026: "config",
  ERR033: "config",
  ERR010: "balance",
  ERR011: "balance",
  ERR013: "transient",
  ERR028: "transient",
  NETWORK: "transient",
  ERR006: "input",
  ERR009: "input",
  ERR012: "input",
  ERR025: "input",
  ERR027: "input",
  ERR_INVALID_INPUT: "input",
};

export function classifyError(code: string | undefined): ErrorClass {
  return (code && CLASSES[code]) || "unknown";
}

/** One log line: code, class, API text. No credentials, phone or OTP code. */
export function describeSendError(code: string | undefined, description?: string): string {
  const text = (code && API_ERRORS[code]) || description || "unknown error";
  return `${code ?? "NO_CODE"} [${classifyError(code)}] ${text}`;
}
