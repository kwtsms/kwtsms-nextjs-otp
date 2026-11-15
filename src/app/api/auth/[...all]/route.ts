/*
FILE:      src/app/api/auth/[...all]/route.ts
CREATED:   2026-11-15 10:25 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Better Auth HTTP handler (Next.js App Router).
WHY:       Exposes the phone-number OTP endpoints under /api/auth.
*/

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

// Lazy so that `next build` never needs credentials or a database.
export function GET(req: Request) {
  return toNextJsHandler(getAuth()).GET(req);
}
export function POST(req: Request) {
  return toNextJsHandler(getAuth()).POST(req);
}
