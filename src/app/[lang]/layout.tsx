/*
FILE:      src/app/[lang]/layout.tsx
CREATED:   2026-11-15 11:00 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Root layout: sets lang and dir (rtl for Arabic) and the page frame.
WHY:       Arabic needs dir=rtl on the html element; the language is part of the URL.
*/

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dir, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/template";
import "../globals.css";

export const metadata: Metadata = {
  title: "kwtSMS OTP login",
  description: "SMS one-time-code sign in with Next.js, Better Auth and kwtSMS.",
};

export const dynamicParams = false;
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang as Lang)) notFound();
  return (
    <html lang={lang} dir={dir(lang as Lang)}>
      <body>
        <main className="card">{children}</main>
      </body>
    </html>
  );
}
