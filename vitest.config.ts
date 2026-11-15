/*
FILE:      vitest.config.ts
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Vitest config for unit tests (tests/unit).
WHY:       Keeps Playwright specs in e2e/ out of the unit run; resolves the @ alias.
*/
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
