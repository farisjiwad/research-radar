/**
 * Assign each fetched paper to its first listed arXiv category, once.
 * @param {Array<{categories: string[]}>} papers
 * @returns {Array<{category: string, count: number}>}
 */
export function categoryBreakdown(papers) {
  const counts = new Map();
  for (const paper of papers) {
    const category = paper.categories[0] || "Uncategorized";
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts].map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}
