/*
FILE:      src/components/sign-out-button.tsx
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Client button that ends the session.
WHY:       Sign out must clear the Better Auth cookie in the browser.
*/

"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ lang, label }: { lang: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      data-testid="sign-out"
      onClick={async () => {
        await authClient.signOut();
        router.push(`/${lang}`);
      }}
    >
      {label}
    </button>
  );
}
