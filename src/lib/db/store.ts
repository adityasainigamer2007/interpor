import "server-only";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import Database from "better-sqlite3";

import { type Database as Db, EMPTY_DB } from "./schema";

/**
 * SQLite-backed datastore.
 *
 * The portal keeps its working set in memory for reads — every query in
 * `queries.ts` filters plain arrays — and treats SQLite as the durable source
 * of truth. Each mutation is flushed inside a single transaction, so a crash
 * or a power cut can never leave a half-written state, and WAL mode keeps
 * concurrent readers from blocking the writer.
 *
 * Layout is one table per collection, one row per entity (`id`, `data` JSON).
 * That keeps the document model the application code already uses while giving
 * real transactional durability. Reads never touch the disk after boot.
 */

const DB_FILE = process.env.DATABASE_FILE
  ? path.resolve(process.env.DATABASE_FILE)
  : path.join(process.cwd(), "data", "portal.db");

const COLLECTIONS = [
  "users",
  "sessions",
  "codes",
  "invitations",
  "projects",
  "tasks",
  "timeEntries",
  "submissions",
  "announcements",
  "resources",
  "audit",
] as const;

type Collection = (typeof COLLECTIONS)[number];

interface Handle {
  sql: Database.Database;
  db: Db;
  /** Digest of each collection at last flush, so unchanged tables are skipped. */
  marks: Map<Collection, string>;
}

// Survive dev-server hot reloads, which would otherwise reopen the file per edit.
const globalHandle = globalThis as unknown as { __ayavaStore?: Handle };

function open(): Handle {
  if (globalHandle.__ayavaStore) return globalHandle.__ayavaStore;

  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const sql = new Database(DB_FILE);

  // WAL survives crashes and lets reads proceed during a write.
  sql.pragma("journal_mode = WAL");
  sql.pragma("synchronous = NORMAL");
  sql.pragma("foreign_keys = ON");

  for (const name of COLLECTIONS) {
    sql.exec(`CREATE TABLE IF NOT EXISTS "${name}" (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }

  const db = structuredClone(EMPTY_DB);
  const marks = new Map<Collection, string>();

  for (const name of COLLECTIONS) {
    const rows = sql.prepare(`SELECT data FROM "${name}"`).all() as { data: string }[];
    const parsed = rows.map((r) => JSON.parse(r.data));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db as any)[name] = parsed;
    marks.set(name, digest(parsed));
  }

  const handle: Handle = { sql, db, marks };
  globalHandle.__ayavaStore = handle;
  return handle;
}

function digest(value: unknown): string {
  return crypto.createHash("sha1").update(JSON.stringify(value)).digest("base64");
}

function flush(handle: Handle): void {
  const { sql, db, marks } = handle;

  const changed: Collection[] = [];
  for (const name of COLLECTIONS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = digest((db as any)[name]);
    if (current !== marks.get(name)) changed.push(name);
  }
  if (!changed.length) return;

  const write = sql.transaction(() => {
    for (const name of changed) {
      sql.prepare(`DELETE FROM "${name}"`).run();
      const insert = sql.prepare(`INSERT INTO "${name}" (id, data) VALUES (?, ?)`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of (db as any)[name] as { id: string }[]) {
        insert.run(row.id, JSON.stringify(row));
      }
    }
  });

  write();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const name of changed) marks.set(name, digest((db as any)[name]));
}

/** Read-only view. Never mutate the result — use `mutate`. */
export function read(): Db {
  return open().db;
}

/** Apply a mutation and commit it in one transaction. */
export function mutate<T>(fn: (db: Db) => T): T {
  const handle = open();
  const result = fn(handle.db);
  flush(handle);
  return result;
}

/** True when nobody has an account yet — gates the first-run setup page. */
export function isUninitialised(): boolean {
  return read().users.length === 0;
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}

export function now(): string {
  return new Date().toISOString();
}

export const databaseFile = DB_FILE;

/** Row counts, for the admin console's storage panel. */
export function storageStats(): { file: string; sizeBytes: number; counts: Record<string, number> } {
  const handle = open();
  const counts: Record<string, number> = {};
  for (const name of COLLECTIONS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    counts[name] = ((handle.db as any)[name] as unknown[]).length;
  }
  let sizeBytes = 0;
  try {
    sizeBytes = fs.statSync(DB_FILE).size;
  } catch {
    sizeBytes = 0;
  }
  return { file: DB_FILE, sizeBytes, counts };
}
