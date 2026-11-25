import { DatabaseSync } from "node:sqlite";
import { realpathSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { makeBackup } from "../src/utils/storage.js";

const target = process.argv[2];
if (!target) throw new Error("Specify a new backup file outside this project, e.g. npm run export-sqlite -- ~/Downloads/research-radar-backup.json");
const root = realpathSync(".");
const destination = resolve(realpathSync(dirname(resolve(target))), target.split(sep).pop());
const relativePath = relative(root, destination);
if (relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== "..")) throw new Error("Choose a backup location outside this project so it cannot be published.");
const db = new DatabaseSync(resolve(root, "data/radar.sqlite"), { readOnly: true });
try {
  const saved = db.prepare("SELECT paper, saved_at FROM saved ORDER BY saved_at DESC").all().map((row) => ({ ...JSON.parse(row.paper), savedAt: row.saved_at }));
  const interests = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='interests'").get()?.value || "[]");
  const feedback = Object.fromEntries(db.prepare("SELECT paper_id, value FROM feedback").all().map((row) => [row.paper_id, row.value]));
  writeFileSync(destination, JSON.stringify(makeBackup({ saved, interests, feedback }), null, 2), { flag: "wx", mode: 0o600 });
  console.log(`Private backup written to ${destination}. Import it in the static app; keep this file private.`);
} finally { db.close(); }
