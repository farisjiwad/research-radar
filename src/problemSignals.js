/**
 * Extract literal abstract sentences as unverified leads, not validated gaps.
 * @param {Array<{id: string, abstract: string}>} papers
 * @returns {Array<{paperId: string, passage: string, kind: "future" | "challenge"}>}
 */
export function extractProblemSignals(papers) {
  const future = /\b(open (?:question|problem|challenge)|future (?:work|research|studies)|remains? (?:an? )?(?:open|unresolved)|unresolved)\b/i;
  const challenge = /\b(challenges?|challenging|limitations?|bottlenecks?|remain(?:s)? difficult|remains? unclear)\b/i;
  return papers.flatMap((paper) => {
    const sentences = paper.abstract.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
    const passage = sentences.find((sentence) => future.test(sentence)) || sentences.find((sentence) => challenge.test(sentence));
    return passage ? [{ paperId: paper.id, passage, kind: future.test(passage) ? /** @type {const} */ ("future") : /** @type {const} */ ("challenge") }] : [];
  });
}
