/*
FILE:      src/components/login-form.tsx
CREATED:   2026-11-15 11:00 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Client form: phone step, code step, errors, mode banner, demo code.
WHY:       Drives Better Auth sendOtp and verify; shows only generic, localized messages.
*/

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toAsciiDigits } from "@/lib/digits";
import { authClient } from "@/lib/auth-client";
import type { Dict } from "@/lib/i18n";
import type { Mode } from "@/lib/config";

type Step = "phone" | "code";

export function LoginForm({ lang, mode, t }: { lang: "en" | "ar"; mode: Mode; t: Dict }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [busy, setBusy] = useState(false);

  const message = (e: { code?: string } | null | undefined) => {
    const key = (e?.code ?? "GENERIC") as keyof Dict;
    return key in t ? t[key] : t.GENERIC;
  };

  async function send() {
    setBusy(true);
    setError("");
    const { data, error: err } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
      fetchOptions: { headers: { "x-otp-lang": lang } },
    });
    setBusy(false);
    if (err) return setError(message(err));
    setDemoCode(String((data as { demoCode?: string | null } | null)?.demoCode ?? ""));
    setCode("");
    setStep("code");
  }

  async function verify() {
    setBusy(true);
    setError("");
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: phone, code });
    setBusy(false);
    if (err) return setError(message(err));
    router.push(`/${lang}/account`);
  }

  return (
    <>
      <nav>
        <Link href={lang === "ar" ? "/en" : "/ar"} data-testid="lang-switch">
          {t.otherLang}
        </Link>
      </nav>
      {mode !== "live" && (
        <p className="banner" data-testid="banner">
          {mode === "demo" ? t.demoBanner : t.testBanner}
        </p>
      )}
      <h1>{t.title}</h1>
      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="phone">{t.phoneLabel}</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <small>{t.phoneHint}</small>
          <button type="submit" disabled={busy} data-testid="send">
            {t.send}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p role="status">{t.codeSent}</p>
          {demoCode && (
            <p className="demo-code" data-testid="demo-code">
              {t.demoCode}: <bdi>{demoCode}</bdi>
            </p>
          )}
          <label htmlFor="code">{t.codeLabel}</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(e) => setCode(toAsciiDigits(e.target.value).replace(/\D/g, ""))}
            required
          />
          <small>{t.codeHint}</small>
          <button type="submit" disabled={busy} data-testid="verify">
            {t.verify}
          </button>
          <div className="links">
            <button type="button" className="link" onClick={() => void send()} data-testid="resend">
              {t.resend}
            </button>
            <button type="button" className="link" onClick={() => setStep("phone")}>
              {t.change}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="error" data-testid="error">
          {error}
        </p>
      )}
    </>
  );
}
