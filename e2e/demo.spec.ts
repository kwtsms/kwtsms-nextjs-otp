/*
FILE:      e2e/demo.spec.ts
CREATED:   2026-11-15 10:31 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      E2E in demo mode: full login in English and Arabic, errors, RTL, screenshots (desktop and mobile).
WHY:       The 2-minute demo is the first thing a developer sees; it must work with no account and look right in both languages.
*/
import { expect, test } from "@playwright/test";
import { fresh, newPage, shot } from "./helpers";

test("root redirects to /en", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

for (const mobile of [false, true]) {
  const size = mobile ? "mobile" : "desktop";

  test(`English demo login, ${size}`, async ({ browser }) => {
    const { ip, local } = fresh();
    const page = await newPage(browser, ip, { mobile });
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("banner")).toHaveText("Demo: no SMS sent");
    await shot(page, `en-1-phone-${size}`);

    await page.getByLabel("Mobile number").fill(local);
    await page.getByTestId("send").click();
    await expect(page.getByTestId("demo-code")).toBeVisible();
    const code = (await page.getByTestId("demo-code").locator("bdi").innerText()).trim();
    expect(code).toMatch(/^\d{6}$/);
    await shot(page, `en-2-code-${size}`);

    await page.getByLabel("Verification code").fill(code);
    await page.getByTestId("verify").click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(page.getByTestId("signed-in")).toHaveText("You are signed in");
    const masked = await page.getByTestId("masked-phone").innerText();
    expect(masked).toContain("*");
    expect(masked).not.toContain(local);
    await shot(page, `en-3-account-${size}`);

    await page.getByTestId("sign-out").click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto("/en/account");
    await expect(page).toHaveURL(/\/en$/); // session gone
  });

  test(`Arabic demo login with Arabic-Indic digits, rtl, ${size}`, async ({ browser }) => {
    const { ip, local } = fresh();
    const page = await newPage(browser, ip, { mobile });
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByTestId("banner")).toHaveText("تجريبي: لم تُرسل أي رسالة");
    await shot(page, `ar-1-phone-${size}`);

    const arabicDigits = local.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    await page.getByLabel("رقم الجوال").fill(arabicDigits);
    await page.getByTestId("send").click();
    await expect(page.getByTestId("demo-code")).toBeVisible();
    const code = (await page.getByTestId("demo-code").locator("bdi").innerText()).trim();
    await shot(page, `ar-2-code-${size}`);

    const arabicCode = code.replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
    await page.getByLabel("رمز التحقق (OTP)").fill(arabicCode);
    await page.getByTestId("verify").click();
    await expect(page).toHaveURL(/\/ar\/account$/);
    await expect(page.getByTestId("signed-in")).toHaveText("تم تسجيل دخولك");
    await shot(page, `ar-3-account-${size}`);
  });
}

test("language switch keeps working", async ({ page }) => {
  await page.goto("/en");
  await page.getByTestId("lang-switch").click();
  await expect(page).toHaveURL(/\/ar$/);
  await page.getByTestId("lang-switch").click();
  await expect(page).toHaveURL(/\/en$/);
});

test("errors: invalid number, non-allowed country, wrong code (EN and AR)", async ({ browser }) => {
  const { ip, local } = fresh();
  const page = await newPage(browser, ip);
  await page.goto("/en");
  await page.getByLabel("Mobile number").fill("12");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("error")).toHaveText("Enter a valid mobile number.");

  await page.getByLabel("Mobile number").fill("+44 7911 123456");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("error")).toHaveText("SMS to this country is not enabled.");
  await shot(page, "en-error-country");

  await page.getByLabel("Mobile number").fill(local);
  await page.getByTestId("send").click();
  await page.getByLabel("Verification code").fill("000000");
  await page.getByTestId("verify").click();
  await expect(page.getByTestId("error")).toHaveText("That code is not correct.");

  await page.goto("/ar");
  await page.getByLabel("رقم الجوال").fill("+44 7911 123456");
  await page.getByTestId("send").click();
  await expect(page.getByTestId("error")).toHaveText("الإرسال إلى هذه الدولة غير مفعّل.");
  await shot(page, "ar-error-country");
});
