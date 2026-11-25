import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", isArray: (name) => ["entry", "author", "category", "link"].includes(name) });
const text = (value) => typeof value === "string" ? value : String(value?.["#text"] ?? "");
const clean = (value) => text(value).replace(/\s+/g, " ").trim();

export function parseFeed(xml) {
  const parsed = parser.parse(xml);
  if (!parsed.feed || parsed.feed.entry?.some((entry) => !entry.id || !entry.title)) throw new Error("arXiv returned an invalid feed.");
  const papers = (parsed.feed.entry || []).map((entry) => {
    const versionedId = clean(entry.id).split("/abs/")[1];
    if (!versionedId) throw new Error("arXiv returned an entry without a valid identifier.");
    const id = versionedId.replace(/v\d+$/, "");
    return {
      id,
      title: clean(entry.title),
      abstract: clean(entry.summary),
      authors: (entry.author || []).map((author) => clean(author.name)),
      published: clean(entry.published),
      updated: clean(entry.updated),
      categories: (entry.category || []).map((category) => category["@_term"]).filter(Boolean),
      url: `https://arxiv.org/abs/${encodeURIComponent(id)}`,
      versionUrl: `https://arxiv.org/abs/${versionedId}`,
    };
  });
  return [...new Map(papers.map((paper) => [paper.id, paper])).values()];
}

export function discoveryQuery({ topic = "all", search = "", days = 30 }, now = new Date()) {
  const allowedTopics = new Set(["all", "autonomous", "cs.AI", "cs.LG", "cs.CL", "cs.CV", "cs.CR", "cs.SE", "cs.HC", "cs.RO", "cs.OS", "cs.DB", "cs.DC", "cs.PL", "cs.IR", "cs.NE", "cs.SY", "cs.TH"]);
  if (!allowedTopics.has(topic)) throw new Error("Unknown topic.");
  const window = Number(days);
  if (![7, 30, 90, 365].includes(window)) throw new Error("Invalid date range.");
  const safeSearch = search.trim().replace(/[^a-zA-Z0-9 -]/g, " ").replace(/\s+/g, " ").slice(0, 100);
  const start = new Date(now.getTime() - window * 86400000);
  const stamp = (date) => date.toISOString().slice(0, 16).replace(/[-T:]/g, "");
  const category = topic === "all" ? "cat:cs.*" : topic === "autonomous" ? "(cat:cs.RO OR cat:cs.MA OR cat:cs.SY)" : `cat:${topic}`;
  const parts = [category, `submittedDate:[${stamp(start)} TO ${stamp(now)}]`];
  if (safeSearch) parts.push(`all:"${safeSearch}"`);
  return parts.join(" AND ");
}

export function discoveryLimit(value) {
  if (value === null) return 40;
  if (!["40", "100", "200"].includes(value)) throw new Error("Result limit must be 40, 100, or 200.");
  return Number(value);
}

const stopwords = new Set("about across after against among analysis approach approaches based between computer data deep effects evaluation from into learning method methods million model models network networks paper research results study systems their these through using which with without towards toward large language".split(" "));
export function relatedTerms(title) {
  const words = (value) => [...new Set(value.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [])].filter((word) => !stopwords.has(word));
  const afterColon = title.includes(":") ? words(title.slice(title.indexOf(":") + 1)) : [];
  return (afterColon.length >= 2 ? afterColon : words(title)).slice(0, 2);
}

export function opportunity(paper, related, terms, searchedAt) {
  const sentences = paper.abstract.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  const explicit = sentences.find((sentence) => /\b(open question|future work|future research|remains (?:an? )?(?:open|challenge)|unresolved|remains unclear)\b/i.test(sentence));
  const passage = explicit || sentences[0] || paper.abstract;
  return {
    kind: explicit ? "Possible author-stated direction" : "Speculative investigation",
    title: explicit ? "Examine the authors’ stated direction" : `Investigate the scope of ${terms.join(", ") || "this paper's approach"}`,
    direction: explicit
      ? "Read the full paper to verify the context, then test whether the stated direction is already addressed by related work."
      : "Read the full paper, define a specific setting or limitation, and compare it with the related work below before formulating a research question.",
    passage, attribution: `${paper.authors.join(", ") || "Authors"} · abstract`, evidenceUrl: paper.versionUrl,
    evidenceDate: paper.updated, terms, searchedAt, related,
  };
}

let lastRequest = 0;
let queue = Promise.resolve();
const cache = new Map();
export function fetchArxiv(query, maxResults = 40) {
  const key = `${query}:${maxResults}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return Promise.resolve(cached.papers);
  const run = queue.catch(() => {}).then(async () => {
    const wait = Math.max(0, 3100 - (Date.now() - lastRequest));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    const url = new URL("https://export.arxiv.org/api/query");
    url.search = new URLSearchParams({ search_query: query, start: "0", max_results: String(maxResults), sortBy: "submittedDate", sortOrder: "descending" }).toString();
    lastRequest = Date.now();
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { "User-Agent": "ResearchRadarLocal/1.0 (local research discovery)" } }); }
    catch (error) { throw new Error(`Could not reach arXiv: ${error.message}. Check your connection and try again.`); }
    if (!response.ok) throw new Error(`arXiv returned HTTP ${response.status}. Please try again later.`);
    const papers = parseFeed(await response.text());
    cache.set(key, { at: Date.now(), papers });
    return papers;
  });
  queue = run;
  return run;
}
