import { mkdir, writeFile } from "node:fs/promises";
import { fetchArxiv } from "../server/arxiv.js";

const categories = ["cs.*", "cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.CR", "cs.SE", "cs.HC", "cs.RO", "cs.OS", "cs.DB", "cs.DC", "cs.PL", "cs.IR", "cs.NE", "eess.SY", "cs.CC", "cs.MA"];
const perCategoryLimit = 200;
const papers = new Map();
for (const category of categories) {
  const found = await fetchArxiv(`cat:${category}`, perCategoryLimit);
  if (!found.length) throw new Error(`arXiv returned no results for ${category}; refusing to publish an incomplete snapshot.`);
  console.log(`${category}: ${found.length} papers`);
  for (const paper of found) {
    const previous = papers.get(paper.id);
    if (!previous || paper.updated > previous.updated) papers.set(paper.id, paper);
  }
}
const snapshot = { version: 1, generatedAt: new Date().toISOString(), perCategoryLimit, categories, papers: [...papers.values()].sort((a, b) => b.published.localeCompare(a.published)) };
await mkdir("public/data", { recursive: true });
await writeFile("public/data/papers.json", JSON.stringify(snapshot));
console.log(`Wrote ${snapshot.papers.length} deduplicated public papers to public/data/papers.json.`);
