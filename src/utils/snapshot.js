/** @typedef {import("./storage.js").Paper} Paper */
/** @typedef {{version:number, generatedAt:string, perCategoryLimit:number, categories:string[], papers:Paper[]}} Snapshot */
/** @param {Snapshot} snapshot @param {{topic:string,days:string,search:string,limit:string}} filters @param {number} [now] */
export function filterSnapshot(snapshot, filters, now = Date.now()) {
  const start = now - Number(filters.days) * 86400000;
  const term = filters.search.trim().toLowerCase();
  return snapshot.papers.filter((paper) => {
    const submitted = Date.parse(paper.published);
    const category = filters.topic === "cs.SY" ? "eess.SY" : filters.topic === "cs.TH" ? "cs.CC" : filters.topic;
    const categoryMatch = category === "all" ? paper.categories.some((c) => c.startsWith("cs.")) : category === "autonomous" ? paper.categories.some((c) => ["cs.RO", "cs.MA", "eess.SY"].includes(c)) : paper.categories.includes(category);
    return categoryMatch && submitted >= start && submitted <= now && (!term || [paper.title, paper.abstract, paper.authors.join(" "), paper.id, paper.categories.join(" ")].join(" ").toLowerCase().includes(term));
  }).sort((a, b) => Date.parse(b.published) - Date.parse(a.published)).slice(0, Number(filters.limit));
}
