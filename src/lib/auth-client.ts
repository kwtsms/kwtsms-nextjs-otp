/*
FILE:      src/lib/auth-client.ts
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Better Auth browser client with the phone-number plugin.
WHY:       Client side of the OTP flow.
*/

import { phoneNumberClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({ plugins: [phoneNumberClient()] });
