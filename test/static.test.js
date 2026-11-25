import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { emptyState, loadState, saveState, makeBackup, parseBackup } from "../src/storage.js";
import { filterSnapshot } from "../src/snapshot.js";
import { prepareInvestigation } from "../src/investigation.js";
import { createStore } from "../server/store.js";

const paper = { id: "2501.12345", title: "Test: Safe Robot Navigation", abstract: "This is an open question. More work is needed.", authors: ["Researcher"], published: "2025-01-03T00:00:00Z", updated: "2025-01-04T00:00:00Z", categories: ["cs.RO"], url: "https://arxiv.org/abs/2501.12345", versionUrl: "https://arxiv.org/abs/2501.12345v2" };
function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
}
test("browser state survives reload and backup round trip without accepting corrupted imports", () => {
  const storage = memoryStorage();
  const state = { saved: [paper], interests: ["autonomous", "cs.OS"], feedback: { [paper.id]: "relevant" } };
  assert.deepEqual(loadState(storage), emptyState());
  saveState(storage, state);
  assert.deepEqual(loadState(storage), state);
  assert.deepEqual(parseBackup(JSON.parse(JSON.stringify(makeBackup(state)))), state);
  assert.throws(() => parseBackup({ format: "research-radar-backup", version: 1, data: { ...state, saved: [{ ...paper, versionUrl: "javascript:alert(1)" }] } }), /Invalid arXiv URL/);
  assert.deepEqual(loadState(storage), state);
  assert.throws(() => saveState({ setItem() { throw new Error("quota"); } }, state), /quota/);
});
test("static filters use category aliases, literal search, date and display limit", () => {
  const snapshot = { papers: [paper, { ...paper, id: "2", categories: ["eess.SY"], title: "Control" }, { ...paper, id: "3", categories: ["cs.CC"], title: "Theory" }] };
  const params = { topic: "autonomous", days: "7", search: "", limit: "40" };
  const now = Date.parse("2025-01-05T00:00:00Z");
  assert.deepEqual(filterSnapshot(snapshot, params, now).map((p) => p.id), ["2501.12345", "2"]);
  assert.deepEqual(filterSnapshot(snapshot, { ...params, topic: "cs.TH" }, now).map((p) => p.id), ["3"]);
  assert.deepEqual(filterSnapshot(snapshot, { ...params, topic: "all", search: "safe robot", limit: "1" }, now).map((p) => p.id), ["2501.12345"]);
  assert.equal(filterSnapshot(snapshot, { ...params, days: "1" }, now).length, 0);
});
test("investigation links to manual arXiv search without reporting fabricated results", () => {
  const result = prepareInvestigation(paper);
  assert.equal(result.passage, "This is an open question.");
  assert.equal(new URL(result.searchUrl).hostname, "arxiv.org");
  assert.equal("related" in result, false);
});
test("legacy SQLite export writes a private compatible backup without changing the database", () => {
  const parent = mkdtempSync(join(tmpdir(), "radar-migrate-"));
  const project = join(parent, "project"); mkdirSync(project);
  try {
    const dbPath = join(project, "data", "radar.sqlite");
    const store = createStore(dbPath);
    store.save(paper); store.setInterests(["cs.OS"]); store.setFeedback(paper.id, "relevant"); store.close();
    const output = join(parent, "backup.json");
    const script = resolve("scripts/export-sqlite.js");
    const run = spawnSync(process.execPath, [script, output], { cwd: project, encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const data = parseBackup(JSON.parse(readFileSync(output, "utf8")));
    assert.equal(data.saved[0].id, paper.id);
    assert.deepEqual(data.interests, ["cs.OS"]);
    assert.equal(data.feedback[paper.id], "relevant");
    const reopened = createStore(dbPath); assert.equal(reopened.listSaved().length, 1); reopened.close();
    const retry = spawnSync(process.execPath, [script, output], { cwd: project, encoding: "utf8" });
    assert.notEqual(retry.status, 0);
    const unsafe = spawnSync(process.execPath, [script, join(project, "backup.json")], { cwd: project, encoding: "utf8" });
    assert.notEqual(unsafe.status, 0);
  } finally { rmSync(parent, { recursive: true }); }
});
