/*
FILE:      src/app/[lang]/account/page.tsx
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Screen 3: signed-in page with the masked number and sign out.
WHY:       Shows the session works; also the place to add your own app.
*/

import { maskPhone } from "kwtsms";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getAuth } from "@/lib/auth";
import { dict } from "@/lib/i18n";
import type { Lang } from "@/lib/template";

export const dynamic = "force-dynamic";

export default async function Account({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  const t = dict[lang];
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect(`/${lang}`);
  const phone = (session.user as { phoneNumber?: string }).phoneNumber ?? "";
  return (
    <>
      <h1 data-testid="signed-in">{t.signedIn}</h1>
      <p>
        {t.mobile}: <bdi data-testid="masked-phone">{maskPhone(phone.replace(/\D/g, ""))}</bdi>
      </p>
      <SignOutButton lang={lang} label={t.signOut} />
    </>
  );
}
