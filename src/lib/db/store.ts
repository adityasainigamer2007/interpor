import "server-only";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { type Database, EMPTY_DB } from "./schema";

/**
 * Single-document JSON datastore.
 *
 * Everything the portal persists lives in one JSON file, read into memory once
 * and written back atomically (tmp file + rename) on every mutation. That keeps
 * the whole app dependency-free and trivially portable — it is deliberately the
 * only module that knows how persistence works, so swapping in Postgres/Prisma
 * later means reimplementing `read` and `mutate` and nothing else.
 *
 * Suitable for a cohort-sized portal (tens of users) on a single long-lived
 * Node process. See README for the notes on moving to a real database.
 */

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(process.cwd(), "data", "db.json");

type Cache = { db: Database | null };

// Survive dev-server hot reloads, which would otherwise re-read (and race) the file.
const globalCache = globalThis as unknown as { __ayavaDb?: Cache };
const cache: Cache = (globalCache.__ayavaDb ??= { db: null });

function load(): Database {
  if (cache.db) return cache.db;

  if (!fs.existsSync(DATA_FILE)) {
    // First boot: lay down a seeded database so the portal is never a blank slate.
    const seeded = buildSeed();
    persist(seeded);
    cache.db = seeded;
    return seeded;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    // Merge over EMPTY_DB so a file written by an older version still loads.
    cache.db = { ...structuredClone(EMPTY_DB), ...parsed };
    return cache.db;
  } catch (err) {
    throw new Error(
      `Could not read the datastore at ${DATA_FILE}: ${(err as Error).message}. ` +
        `Delete the file to regenerate it from seed.`,
    );
  }
}

function persist(db: Database): void {
  const dir = path.dirname(DATA_FILE);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.db.${crypto.randomBytes(6).toString("hex")}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  fs.renameSync(tmp, DATA_FILE);
}

/** Read-only view of the database. Never mutate the result — use `mutate`. */
export function read(): Database {
  return load();
}

/** Apply a mutation and flush it to disk. Returns whatever the mutator returns. */
export function mutate<T>(fn: (db: Database) => T): T {
  const db = load();
  const result = fn(db);
  persist(db);
  return result;
}

/** Wipe and re-seed. Used by `npm run seed`. */
export function reseed(): Database {
  const seeded = buildSeed();
  persist(seeded);
  cache.db = seeded;
  return seeded;
}

export function id(prefix: string): string {
  // Clerk-ish, readable, sortable-enough identifiers: usr_2fK9xQ...
  return `${prefix}_${crypto.randomBytes(12).toString("base64url")}`;
}

export function now(): string {
  return new Date().toISOString();
}

export const dataFilePath = DATA_FILE;

// Imported lazily to avoid a cycle: seed.ts needs `id`/`now` from this module.
function buildSeed(): Database {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedDatabase } = require("./seed") as typeof import("./seed");
  return seedDatabase();
}
