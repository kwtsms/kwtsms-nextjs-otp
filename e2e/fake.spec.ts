/*
FILE:      e2e/fake.spec.ts
CREATED:   2026-11-15 10:31 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      E2E with the injected fake SMS client: the code is read from the fake outbox; limits, cooldown, templates, raw API guard.
WHY:       Proves the real send path (sendOTP, after(), templates, limits in the database) without any real SMS.
*/
import { expect, test } from "@playwright/test";
import { fresh, newPage, readOutbox, shot, waitForSms } from "./helpers";

test("test mode: code comes by 'SMS' (fake outbox), never on screen; English text is 1 part", async ({ browser }) => {
  const { ip, local } = fresh();
  const page = await newPage(browser, ip);
  await page.goto("/en");
  await expect(page.getByTestId("banner")).toHaveText("Test mode: SMS queued, not delivered");
  await shot(page, "fake-en-banner");
  await page.getByLabel("Mobile number").fill(local);
  await page.getByTestId("send").click();
  await expect(page.getByLabel("Verification code")).toBeVisible();
  await expect(page.getByTestId("demo-code")).toHaveCount(0);

  const sms = await waitForSms(`965${local}`);
  expect(sms.message).toMatch(/^[\x20-\x7e]+$/);
  expect(sms.message.length).toBeLessThanOrEqual(160);
  const code = sms.message.match(/\d{6}/)![0];

  await page.getByLabel("Verification code").fill(code);
  await page.getByTestId("verify").click();
  await expect(page).toHaveURL(/\/en\/account$/);
});

test("Arabic UI sends the Arabic text, 1 part (70 chars)", async ({ browser }) => {
  const { ip, local } = fresh();
  const page = await newPage(browser, ip);
  await page.goto("/ar");
  await expect(page.getByTestId("banner")).toHaveText("وضع التجربة: الرسالة في طابور الارسال ولم تُسلّم");
  await shot(page, "fake-ar-banner");
  await page.getByLabel("رقم الجوال").fill(local);
  await page.getByTestId("send").click();
  const sms = await waitForSms(`965${local}`);
  expect(Array.from(sms.message).length).toBeLessThanOrEqual(70);
  expect(sms.message).toContain("رمز التحقق");
});

test("resend inside the cooldown is refused and sends nothing", async ({ browser }) => {
  const { ip, local } = fresh();
  const page = await newPage(browser, ip);
  await page.goto("/en");
  await page.getByLabel("Mobile number").fill(local);
  await page.getByTestId("send").click();
  await waitForSms(`965${local}`);
  const count = readOutbox().length;
  await page.getByTestId("resend").click();
  await expect(page.getByTestId("error")).toHaveText("Please wait a moment before asking for another code.");
  await page.waitForTimeout(500);
  expect(readOutbox().length).toBe(count);
});

test("3 wrong attempts burn the code even if the right one follows", async ({ browser }) => {
  const { ip, local } = fresh();
  const page = await newPage(browser, ip);
  await page.goto("/en");
  await page.getByLabel("Mobile number").fill(local);
  await page.getByTestId("send").click();
  const code = (await waitForSms(`965${local}`)).message.match(/\d{6}/)![0];
  const wrong = code === "111111" ? "222222" : "111111";
  for (let i = 0; i < 3; i++) {
    await page.getByLabel("Verification code").fill(wrong);
    await page.getByTestId("verify").click();
    await expect(page.getByTestId("error")).toBeVisible();
  }
  await page.getByLabel("Verification code").fill(code);
  await page.getByTestId("verify").click();
  await expect(page).not.toHaveURL(/account/);
  await expect(page.getByTestId("error")).toBeVisible();
});

test("raw /api/auth routes are guarded too: country allowlist and per-IP limit (database counters)", async ({ browser, baseURL }) => {
  const { ip } = fresh();
  const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip, origin: baseURL! } });
  const before = readOutbox().length;
  const uk = await ctx.request.post("/api/auth/phone-number/send-otp", { data: { phoneNumber: "+447911123456" } });
  expect(uk.status()).toBe(400);
  expect((await uk.json()).code).toBe("COUNTRY_NOT_ALLOWED");

  // Default is 10 sends per IP per hour; the 11th request is blocked by Better Auth's rate limiter.
  const statuses: number[] = [];
  for (let i = 0; i < 11; i++) {
    const r = await ctx.request.post("/api/auth/phone-number/send-otp", { data: { phoneNumber: `+965600${String(i).padStart(2, "0")}${String(i).padStart(3, "0")}` } });
    statuses.push(r.status());
  }
  expect(statuses.slice(0, 9).every((s) => s === 200)).toBe(true); // the 400 above also counted for this IP
  expect(statuses.at(-1)).toBe(429);
  await expect.poll(() => readOutbox().length, { timeout: 10_000 }).toBeGreaterThan(before);
});
