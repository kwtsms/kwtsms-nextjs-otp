/*
FILE:      src/app/[lang]/page.tsx
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Screens 1 and 2: enter mobile number, then enter the code.
WHY:       Server shell that passes the mode and dictionary to the client form.
*/

import { LoginForm } from "@/components/login-form";
import { getConfig } from "@/lib/config";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/template";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  return <LoginForm lang={lang} mode={getConfig().mode} t={dict[lang]} />;
}
