/*
FILE:      e2e/helpers.ts
CREATED:   2026-11-15 10:31 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      E2E helpers: fresh browser context per test (own client IP and number), outbox reader, screenshots.
WHY:       The abuse limits are per IP and per number, so tests must not share either.
*/
import { existsSync, readFileSync } from "node:fs";
import { expect, type Browser, type Page } from "@playwright/test";

let n = 0;
export function fresh() {
  n += 1;
  return { ip: `203.0.113.${n + 10}`, local: `5000${String(n).padStart(4, "0")}` };
}

export async function newPage(browser: Browser, ip: string, opts: { mobile?: boolean } = {}): Promise<Page> {
  const ctx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": ip },
    viewport: opts.mobile ? { width: 375, height: 740 } : { width: 1100, height: 800 },
  });
  return ctx.newPage();
}

export const shot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/shots/${name}.png`, fullPage: true });

export interface Sms {
  mobile: string;
  message: string;
}
export function readOutbox(): Sms[] {
  const f = ".e2e/outbox.jsonl";
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as Sms);
}

/** The send runs after the response (Next after()), so poll for it. */
export async function waitForSms(mobile: string): Promise<Sms> {
  await expect.poll(() => readOutbox().filter((m) => m.mobile === mobile).length, { timeout: 10_000 }).toBeGreaterThan(0);
  return readOutbox().filter((m) => m.mobile === mobile).at(-1)!;
}
