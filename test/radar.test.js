import test from "node:test";
import assert from "node:assert/strict";
import { discoveryLimit, discoveryQuery, opportunity, parseFeed, relatedTerms } from "../server/arxiv.js";
import { createStore } from "../server/store.js";
import { extractProblemSignals } from "../src/problemSignals.js";
import { categoryBreakdown } from "../src/dashboardData.js";

const xml = `<?xml version="1.0"?><feed><entry><id>https://arxiv.org/abs/2501.12345v2</id><title> Example
  Paper </title><summary>Our work has an open question. More work is needed.</summary><published>2025-01-01T00:00:00Z</published><updated>2025-01-03T00:00:00Z</updated><author><name>A. Researcher</name></author><category term="cs.AI"/></entry><entry><id>https://arxiv.org/abs/2501.12345v3</id><title>Example Paper</title><summary>Updated abstract.</summary><published>2025-01-01T00:00:00Z</published><updated>2025-01-04T00:00:00Z</updated><author><name>A. Researcher</name></author><category term="cs.AI"/></entry></feed>`;

test("feed deduplicates versions and retains submission and revision dates", () => {
  const papers = parseFeed(xml);
  assert.equal(papers.length, 1);
  assert.equal(papers[0].id, "2501.12345");
  assert.equal(papers[0].published, "2025-01-01T00:00:00Z");
  assert.equal(papers[0].updated, "2025-01-04T00:00:00Z");
  assert.equal(papers[0].versionUrl, "https://arxiv.org/abs/2501.12345v3");
  assert.deepEqual(papers[0].categories, ["cs.AI"]);
});
test("discovery query enforces date windows and strips query syntax", () => {
  const query = discoveryQuery({ topic: "cs.AI", days: 7, search: 'agents" OR cat:physics' }, new Date("2025-02-08T12:00:00Z"));
  assert.equal(query, 'cat:cs.AI AND submittedDate:[202502011200 TO 202502081200] AND all:"agents OR cat physics"');
  assert.throws(() => discoveryQuery({ topic: "physics" }), /Unknown topic/);
  assert.match(discoveryQuery({ topic: "cs.OS" }), /^cat:cs\.OS AND/);
  assert.match(discoveryQuery({ topic: "autonomous" }), /^\(cat:cs\.RO OR cat:cs\.MA OR cat:cs\.SY\) AND/);
});
test("discovery limits default to 40 and accept only bounded options", () => {
  assert.equal(discoveryLimit(null), 40);
  assert.equal(discoveryLimit("100"), 100);
  assert.equal(discoveryLimit("200"), 200);
  for (const invalid of ["", "41", "201", "1000", "100.0"]) assert.throws(() => discoveryLimit(invalid), /Result limit/);
});
test("problem signals preserve quoted abstract text, label matches, and omit non-matches", () => {
  const papers = [
    { id: "1", abstract: "This is challenging. Future work will test safety." },
    { id: "2", abstract: "The main limitation is latency. We propose a design." },
    { id: "3", abstract: "We describe a system." },
  ];
  assert.deepEqual(extractProblemSignals(papers), [
    { paperId: "1", passage: "Future work will test safety.", kind: "future" },
    { paperId: "2", passage: "The main limitation is latency.", kind: "challenge" },
  ]);
});
test("dashboard counts each paper once by its first listed category", () => {
  const papers = [
    { categories: ["cs.OS", "cs.AI"] }, { categories: ["cs.AI", "cs.OS"] },
    { categories: ["cs.OS"] }, { categories: [] },
  ];
  assert.deepEqual(categoryBreakdown(papers), [
    { category: "cs.OS", count: 2 }, { category: "cs.AI", count: 1 }, { category: "Uncategorized", count: 1 },
  ]);
  assert.deepEqual(categoryBreakdown([]), []);
});
test("opportunity quotes the abstract verbatim and labels speculative fallback", () => {
  const paper = parseFeed(xml)[0];
  paper.abstract = "This is an open question. We propose a method.";
  const terms = relatedTerms("Reliable Quantum Memory for Distributed Robots");
  assert.deepEqual(relatedTerms("OmniAct: One Policy, One Million Embodiments"), ["policy", "embodiments"]);
  const explicit = opportunity(paper, [], terms, "2025-01-05");
  assert.equal(explicit.passage, "This is an open question.");
  assert.equal(explicit.kind, "Possible author-stated direction");
  paper.abstract = "We propose a method. It works.";
  const inferred = opportunity(paper, [], terms, "2025-01-05");
  assert.equal(inferred.passage, "We propose a method.");
  assert.equal(inferred.kind, "Speculative investigation");
});
test("shortlist, interests and feedback persist across database reopen", async () => {
  const { mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const directory = mkdtempSync(join(tmpdir(), "radar-test-"));
  const path = join(directory, "test.sqlite");
  try {
    let store = createStore(path);
    const paper = parseFeed(xml)[0];
    store.save(paper); store.setInterests(["cs.AI"]); store.setFeedback(paper.id, "relevant"); store.close();
    store = createStore(path);
    assert.equal(store.listSaved()[0].id, paper.id);
    assert.deepEqual(store.getInterests(), ["cs.AI"]);
    assert.equal(store.getFeedback()[paper.id], "relevant");
    store.remove(paper.id); store.setFeedback(paper.id, "");
    assert.equal(store.listSaved().length, 0);
    assert.deepEqual(store.getFeedback(), {});
    store.close();
  } finally { rmSync(directory, { recursive: true }); }
});
