/*
FILE:      src/lib/i18n.ts
CREATED:   2026-11-15 10:32 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      English and Arabic UI strings (20-line dictionary) and the direction helper.
WHY:       No i18n library for 3 screens; wording follows the kwtSMS terms glossary.
*/

import type { Lang } from "./template";

export const LANGS: Lang[] = ["en", "ar"];

export const dict = {
  en: {
    title: "Sign in with your phone",
    phoneLabel: "Mobile number",
    phoneHint: "Kuwait: 8 digits, or with +965",
    send: "Send code",
    codeLabel: "Verification code",
    codeHint: "Enter the 6-digit code from the SMS.",
    codeSent: "Code sent. Check your SMS.",
    verify: "Verify and sign in",
    resend: "Send a new code",
    change: "Use another number",
    signedIn: "You are signed in",
    signOut: "Sign out",
    mobile: "Mobile number",
    otherLang: "العربية",
    demoBanner: "Demo: no SMS sent",
    testBanner: "Test mode: SMS queued, not delivered",
    demoCode: "Demo code",
    INVALID_PHONE: "Enter a valid mobile number.",
    COUNTRY_NOT_ALLOWED: "SMS to this country is not enabled.",
    COOLDOWN: "Please wait a moment before asking for another code.",
    LIMIT: "Too many requests. Try again later.",
    INVALID_OTP: "That code is not correct.",
    OTP_EXPIRED: "The code has expired. Send a new one.",
    TOO_MANY_ATTEMPTS: "Too many wrong attempts. Send a new code.",
    GENERIC: "Something went wrong. Try again.",
  },
  ar: {
    title: "تسجيل الدخول برقم الجوال",
    phoneLabel: "رقم الجوال",
    phoneHint: "الكويت: 8 أرقام، أو مع 965",
    send: "إرسال الرمز",
    codeLabel: "رمز التحقق (OTP)",
    codeHint: "أدخل الرمز المكون من 6 أرقام من الرسالة النصية.",
    codeSent: "تم إرسال الرمز. تحقق من رسائلك النصية.",
    verify: "تحقق وسجل الدخول",
    resend: "إرسال رمز جديد",
    change: "استخدام رقم آخر",
    signedIn: "تم تسجيل دخولك",
    signOut: "تسجيل الخروج",
    mobile: "رقم الجوال",
    otherLang: "English",
    demoBanner: "تجريبي: لم تُرسل أي رسالة",
    testBanner: "وضع التجربة: الرسالة في طابور الارسال ولم تُسلّم",
    demoCode: "رمز التجربة",
    INVALID_PHONE: "أدخل رقم جوال صحيح.",
    COUNTRY_NOT_ALLOWED: "الإرسال إلى هذه الدولة غير مفعّل.",
    COOLDOWN: "انتظر قليلاً قبل طلب رمز جديد.",
    LIMIT: "طلبات كثيرة. حاول لاحقاً.",
    INVALID_OTP: "الرمز غير صحيح.",
    OTP_EXPIRED: "انتهت صلاحية الرمز. أرسل رمزاً جديداً.",
    TOO_MANY_ATTEMPTS: "محاولات خاطئة كثيرة. أرسل رمزاً جديداً.",
    GENERIC: "حدث خطأ. حاول مرة أخرى.",
  },
} as const;

export type Dict = Record<keyof (typeof dict)["en"], string>;
export const dir = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");
