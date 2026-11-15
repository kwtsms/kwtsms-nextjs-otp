/*
FILE:      src/instrumentation.ts
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Next.js startup hook: validates config (live mode refuses weak settings) and creates the tables.
WHY:       A misconfigured live deployment must fail at boot, not on the first customer SMS.
*/

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { getConfig } = await import("./lib/config");
  const cfg = getConfig(); // throws ConfigError in live mode with a weak setup
  const { getMigrations } = await import("better-auth/db/migration");
  const { authOptions } = await import("./lib/auth");
  const { getDatabase } = await import("./lib/db");
  const db = getDatabase(cfg);
  const { runMigrations } = await getMigrations(authOptions(cfg, db));
  await runMigrations();
  if (cfg.mode === "demo") console.info("[kwtsms-otp] DEMO mode: no credentials, no SMS is sent.");
  else if (cfg.mode === "test") console.info("[kwtsms-otp] TEST mode: test=1, SMS queued, not delivered.");
  else console.info("[kwtsms-otp] LIVE mode: real SMS, credits are charged.");
}
