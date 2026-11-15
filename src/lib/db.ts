/*
FILE:      src/lib/db.ts
CREATED:   2026-11-15 10:26 +03
TASK:      workqueue job 12
AUTHOR:    M Alhassoun
WHAT:      Opens the database: Postgres when DATABASE_URL is postgres://, otherwise a local SQLite file via node:sqlite.
WHY:       SQLite for a zero-setup local run, Postgres (Neon) for Vercel, with no native modules and one schema (Better Auth migrations).
*/

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import type { AppConfig } from "./config";

export function createDatabase(cfg: AppConfig): Pool | DatabaseSync {
  const url = cfg.databaseUrl;
  if (/^postgres(ql)?:\/\//.test(url)) return new Pool({ connectionString: url });
  const file = url.replace(/^file:/, "");
  mkdirSync(dirname(file), { recursive: true });
  // getBuiltinModule keeps the bundler from trying to resolve node:sqlite.
  const sqlite = process.getBuiltinModule("node:sqlite");
  return new sqlite.DatabaseSync(file);
}

// 2026-11-15 10:26 +03: one shared handle for the app and the startup migration (globalThis survives separate bundles). workqueue job 12.
const g = globalThis as unknown as { __kwtDb?: ReturnType<typeof createDatabase> };
export function getDatabase(cfg: AppConfig): ReturnType<typeof createDatabase> {
  return (g.__kwtDb ??= createDatabase(cfg));
}
