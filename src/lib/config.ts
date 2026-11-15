/*
FILE:      src/lib/config.ts
CREATED:   2026-11-15 10:30 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Reads and validates environment settings; decides demo, test or live mode.
WHY:       One place for every env var, so the live-mode safety checks cannot be skipped.
*/

export type Mode = "demo" | "test" | "live";

export interface Limits {
  /** Seconds between two codes to the same number. */
  cooldownSec: number;
  perPhoneHour: number;
  perPhoneDay: number;
  /** Global sends per 24 h. 0 blocks every send (kill switch). */
  globalDay: number;
  perIpHour: number;
  verifyPerIp10Min: number;
}

export interface AppConfig {
  mode: Mode;
  appName: string;
  username: string;
  password: string;
  senderId: string;
  /** When set, a fake client appends messages to this file (tests only). */
  fakeOutbox: string;
  secret: string;
  baseUrl: string | undefined;
  databaseUrl: string;
  /** Country calling codes allowed as destinations. Empty = deny all. */
  allowedCountries: string[];
  ipHeader: string;
  limits: Limits;
}

export class ConfigError extends Error {}

const DEMO_SECRET = "demo-only-secret-do-not-use-in-production-0000";

function int(env: Record<string, string | undefined>, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new ConfigError(`${key} must be a whole number >= 0`);
  return n;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const username = (env.KWTSMS_USERNAME ?? "").trim();
  const password = env.KWTSMS_PASSWORD ?? "";
  const fakeOutbox = (env.KWTSMS_FAKE_OUTBOX ?? "").trim();
  const live = env.KWTSMS_LIVE === "1";
  const hasCreds = username !== "" && password !== "";

  let mode: Mode = "demo";
  if (live) mode = "live";
  else if (hasCreds || fakeOutbox !== "") mode = "test";

  const secret = env.BETTER_AUTH_SECRET ?? "";
  const senderId = (env.KWTSMS_SENDER_ID ?? "").trim();

  if (mode === "live") {
    if (!hasCreds) throw new ConfigError("KWTSMS_LIVE=1 needs KWTSMS_USERNAME and KWTSMS_PASSWORD");
    if (fakeOutbox !== "") throw new ConfigError("KWTSMS_FAKE_OUTBOX must not be set in live mode");
    if (secret.length < 32 || /change-?me|secret-123|demo-only/i.test(secret)) {
      throw new ConfigError("Live mode needs BETTER_AUTH_SECRET of at least 32 random characters (not the placeholder)");
    }
    if (senderId === "" || senderId === "KWT-SMS") {
      throw new ConfigError("Live mode needs your own approved Sender ID in KWTSMS_SENDER_ID (KWT-SMS is for testing only)");
    }
  }

  const vercelUrl = env.VERCEL_PROJECT_PRODUCTION_URL;
  return {
    mode,
    appName: (env.APP_NAME ?? "kwtSMS Demo").trim().slice(0, 16),
    username,
    password,
    senderId: senderId || "KWT-SMS",
    fakeOutbox,
    secret: secret || DEMO_SECRET,
    baseUrl: env.BETTER_AUTH_URL || (vercelUrl ? `https://${vercelUrl}` : undefined),
    databaseUrl: env.DATABASE_URL || "file:./data/app.db",
    allowedCountries: (env.KWTSMS_ALLOWED_COUNTRIES ?? "965")
      .split(",")
      .map((c) => c.trim())
      .filter((c) => /^\d{1,4}$/.test(c)),
    ipHeader: (env.KWTSMS_IP_HEADER ?? "x-vercel-forwarded-for").trim().toLowerCase(),
    limits: {
      cooldownSec: int(env, "OTP_COOLDOWN_SECONDS", 60),
      perPhoneHour: int(env, "OTP_MAX_PER_PHONE_HOUR", 3),
      perPhoneDay: int(env, "OTP_MAX_PER_PHONE_DAY", 5),
      globalDay: int(env, "OTP_MAX_GLOBAL_DAY", 200),
      perIpHour: int(env, "OTP_MAX_PER_IP_HOUR", 10),
      verifyPerIp10Min: int(env, "OTP_MAX_VERIFY_PER_IP_10MIN", 30),
    },
  };
}

let cached: AppConfig | undefined;
export function getConfig(): AppConfig {
  cached ??= loadConfig();
  return cached;
}
