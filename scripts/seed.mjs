/**
 * Reset the demo datastore: `npm run seed`
 *
 * The store seeds itself on first boot (see src/lib/db/store.ts), so resetting
 * is just a matter of removing the JSON document — the next request rebuilds it
 * from src/lib/db/seed.ts.
 */
import fs from "node:fs";
import path from "node:path";

const file = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(process.cwd(), "data", "db.json");

if (fs.existsSync(file)) {
  fs.rmSync(file);
  console.log(`Removed ${file}`);
} else {
  console.log(`No datastore at ${file} — nothing to remove.`);
}

fs.rmSync(path.join(path.dirname(file), "outbox.json"), { force: true });

console.log("It will be rebuilt from seed on the next request.\n");
console.log("Demo accounts (password for all: AyavaStudio2026):");
console.log("  admin    studio@ayavacreatives.com");
console.log("  mentor   priya@ayavacreatives.com, daniel@…, sofia@…");
console.log("  intern   arjun@ayavacreatives.com, maya@…, leo@…, hana@…, noah@…");
