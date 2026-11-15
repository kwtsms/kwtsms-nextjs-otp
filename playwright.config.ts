/*
FILE:      playwright.config.ts
CREATED:   2026-11-15 10:31 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Playwright E2E config: two production servers, one in demo mode (:3100) and one with the injected fake SMS client (:3101).
WHY:       Hermetic CI: no network, no credentials, no real SMS. Run `npm run build` first.
*/
import { defineConfig } from "@playwright/test";

const common = {
  BETTER_AUTH_SECRET: "e2e-only-secret-0123456789abcdef0123456789",
  KWTSMS_IP_HEADER: "x-forwarded-for",
  KWTSMS_USERNAME: "",
  KWTSMS_PASSWORD: "",
  KWTSMS_LIVE: "",
  KWTSMS_FAKE_OUTBOX: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  projects: [
    { name: "demo", testMatch: "demo.spec.ts", use: { baseURL: "http://localhost:3100" } },
    { name: "fake", testMatch: "fake.spec.ts", use: { baseURL: "http://localhost:3101" } },
  ],
  webServer: [
    {
      command: "sh -c 'rm -f .e2e/demo.db*; exec npx next start -p 3100'",
      url: "http://localhost:3100/en",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ...common, PORT: "3100", BETTER_AUTH_URL: "http://localhost:3100", DATABASE_URL: "file:./.e2e/demo.db" },
    },
    {
      command: "sh -c 'rm -f .e2e/fake.db* .e2e/outbox.jsonl; exec npx next start -p 3101'",
      url: "http://localhost:3101/en",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...common,
        PORT: "3101",
        BETTER_AUTH_URL: "http://localhost:3101",
        DATABASE_URL: "file:./.e2e/fake.db",
        KWTSMS_FAKE_OUTBOX: ".e2e/outbox.jsonl",
      },
    },
  ],
});
