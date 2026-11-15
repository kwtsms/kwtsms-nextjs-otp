/*
FILE:      eslint.config.mjs
CREATED:   2026-11-15 10:27 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      ESLint flat config using eslint-config-next (core-web-vitals + typescript).
WHY:       `npm run lint` is a done criterion and a CI step.
*/
import next from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...next,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**", ".e2e/**", "next-env.d.ts"] },
];

export default config;
