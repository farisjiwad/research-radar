/** @typedef {import("./storage.js").Paper} Paper */
const stopwords = new Set("about across after against among analysis approach approaches based between computer data deep effects evaluation from into learning method methods million model models network networks paper research results study systems their these through using which with without towards toward large language".split(" "));
/** @param {string} title */
export function relatedTerms(title) {
  const words = (/** @type {string} */ value) => [...new Set(value.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])].filter((word) => !stopwords.has(word));
  const after = title.includes(":") ? words(title.slice(title.indexOf(":") + 1)) : [];
  return (after.length >= 2 ? after : words(title)).slice(0, 2);
}
/** @param {Paper} paper */
export function prepareInvestigation(paper) {
  const terms = relatedTerms(paper.title);
  const sentences = paper.abstract.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  const explicit = sentences.find((sentence) => /\b(open question|future work|future research|remains (?:an? )?(?:open|challenge)|unresolved|remains unclear)\b/i.test(sentence));
  const url = new URL("https://arxiv.org/search/");
  url.search = new URLSearchParams({ query: terms.join(" ") || paper.title, searchtype: "all", abstracts: "show", order: "-announced_date_first", size: "50" }).toString();
  return { kind: explicit ? "Possible author-stated direction" : "Speculative investigation", title: explicit ? "Examine the authors’ stated direction" : "Investigate the scope of this paper’s approach", direction: "Read the full paper and search related work before formulating a research question.", passage: explicit || sentences[0] || paper.abstract, attribution: `${paper.authors.join(", ") || "Authors"} · abstract`, evidenceUrl: paper.versionUrl, evidenceDate: paper.updated, terms, searchUrl: url.href };
}
