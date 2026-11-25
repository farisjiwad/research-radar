export const STORAGE_KEY = "research-radar-state-v1";

/** @typedef {{id:string,title:string,abstract:string,authors:string[],published:string,updated:string,categories:string[],url:string,versionUrl:string,savedAt?:string}} Paper */
/** @typedef {{saved:Paper[],interests:string[],feedback:Record<string,string>}} PersonalState */
/** @returns {PersonalState} */
export function emptyState() { return { saved: [], interests: [], feedback: {} }; }

/** @param {unknown} value @returns {PersonalState} */
export function validateState(value) {
  if (!value || typeof value !== "object") throw new Error("Invalid backup: expected an object.");
  const obj = /** @type {Record<string, unknown>} */ (value);
  if (!Array.isArray(obj.saved) || !Array.isArray(obj.interests) || !obj.feedback || typeof obj.feedback !== "object" || Array.isArray(obj.feedback) || obj.saved.length > 10000 || obj.interests.length > 100 || Object.keys(obj.feedback).length > 10000) throw new Error("Invalid backup: missing or oversized personal data.");
  const idPattern = /^[a-zA-Z0-9./-]+$/;
  const saved = obj.saved.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid paper in backup.");
    const p = /** @type {Record<string, unknown>} */ (item);
    if (typeof p.id !== "string" || !idPattern.test(p.id) || typeof p.title !== "string" || typeof p.abstract !== "string" || typeof p.published !== "string" || typeof p.updated !== "string" || !Array.isArray(p.authors) || p.authors.some((x) => typeof x !== "string") || !Array.isArray(p.categories) || p.categories.some((x) => typeof x !== "string") || typeof p.url !== "string" || typeof p.versionUrl !== "string" || (p.savedAt !== undefined && typeof p.savedAt !== "string")) throw new Error("Invalid paper in backup.");
    for (const address of [p.url, p.versionUrl]) {
      let url;
      try { url = new URL(address); } catch { throw new Error("Invalid arXiv URL in backup."); }
      if (url.protocol !== "https:" || url.hostname !== "arxiv.org" || !url.pathname.startsWith("/abs/")) throw new Error("Invalid arXiv URL in backup.");
    }
    return /** @type {Paper} */ (p);
  });
  if (new Set(saved.map((paper) => paper.id)).size !== saved.length) throw new Error("Invalid backup: duplicate saved papers.");
  if (obj.interests.some((x) => typeof x !== "string" || !/^(?:autonomous|cs\.[A-Z]{2})$/.test(x))) throw new Error("Invalid interests in backup.");
  const entries = Object.entries(obj.feedback);
  if (entries.some(([id, value]) => !idPattern.test(id) || !["relevant", "not-relevant"].includes(/** @type {string} */ (value)))) throw new Error("Invalid feedback in backup.");
  return { saved, interests: obj.interests, feedback: Object.fromEntries(entries) };
}

/** @param {PersonalState} state */
export function makeBackup(state) { return { format: "research-radar-backup", version: 1, exportedAt: new Date().toISOString(), data: validateState(state) }; }
/** @param {unknown} backup */
export function parseBackup(backup) {
  if (!backup || typeof backup !== "object" || !("format" in backup) || backup.format !== "research-radar-backup" || !("version" in backup) || backup.version !== 1 || !("data" in backup)) throw new Error("Not a supported Research Radar backup.");
  return validateState(backup.data);
}
/** @param {Storage} storage */
export function loadState(storage) { const raw = storage.getItem(STORAGE_KEY); return raw === null ? emptyState() : validateState(JSON.parse(raw)); }
/** @param {Storage} storage @param {PersonalState} state */
export function saveState(storage, state) { storage.setItem(STORAGE_KEY, JSON.stringify(validateState(state))); }
