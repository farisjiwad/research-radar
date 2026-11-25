import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function createStore(path) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS saved (id TEXT PRIMARY KEY, paper TEXT NOT NULL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS feedback (paper_id TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);`);
  return {
    listSaved: () => db.prepare("SELECT paper, saved_at FROM saved ORDER BY saved_at DESC").all().map((row) => ({ ...JSON.parse(row.paper), savedAt: row.saved_at })),
    save: (paper) => db.prepare("INSERT INTO saved VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET paper=excluded.paper").run(paper.id, JSON.stringify(paper), new Date().toISOString()),
    remove: (id) => db.prepare("DELETE FROM saved WHERE id=?").run(id),
    getInterests: () => JSON.parse(db.prepare("SELECT value FROM settings WHERE key='interests'").get()?.value || "[]"),
    setInterests: (interests) => db.prepare("INSERT INTO settings VALUES ('interests', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(interests)),
    getFeedback: () => Object.fromEntries(db.prepare("SELECT paper_id, value FROM feedback").all().map((row) => [row.paper_id, row.value])),
    setFeedback: (id, value) => value === "" ? db.prepare("DELETE FROM feedback WHERE paper_id=?").run(id) : db.prepare("INSERT INTO feedback VALUES (?, ?, ?) ON CONFLICT(paper_id) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").run(id, value, new Date().toISOString()),
    close: () => db.close(),
  };
}
