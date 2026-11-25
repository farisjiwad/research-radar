import { ArrowRight, ArrowUpRight, Bookmark, CircleHelp, FileText, Layers2, Lightbulb, LoaderCircle } from "lucide-react";
import { categoryBreakdown } from "../utils/dashboardData.js";
import { extractProblemSignals } from "../utils/problemSignals.js";
import { date, topicName } from "../research.js";
import type { Paper, Result, State, View } from "../types.js";

type DashboardProps = {
  result: Result | null;
  loading: boolean;
  error: string;
  retry: () => void;
  state: State;
  stateReady: boolean;
  navigate: (view: View) => void;
  openPaper: (paper: Paper) => void;
};

export function Dashboard({ result, loading, error, retry, state, stateReady, navigate, openPaper }: DashboardProps) {
  const papers = result?.papers || [];
  const breakdown = categoryBreakdown(papers);
  const signals = extractProblemSignals(papers);
  const lookup = new Map(papers.map((paper) => [paper.id, paper]));
  const visible = breakdown.slice(0, 6);
  const remaining = breakdown.slice(6).reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="dashboard" aria-label="Research overview">
      <div className="dashboard-scope dashboard-scope-compact">
        <span>
          {result
            ? `${papers.length} papers in this view · Updated ${new Date(result.fetchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC`
            : "Snapshot unavailable"}
        </span>
        <button className="text-button" onClick={() => navigate("about")}>About data</button>
      </div>

      <div className="dashboard-stats">
        <div className="dashboard-stat">
          <span className="stat-icon"><FileText size={17} /></span>
          <span className="stat-label">PAPERS FETCHED</span>
          <strong>{result ? papers.length : "—"}</strong>
          <small>Within current filters</small>
        </div>
        <div className="dashboard-stat">
          <span className="stat-icon"><Layers2 size={17} /></span>
          <span className="stat-label">CATEGORIES SEEN</span>
          <strong>{result ? breakdown.length : "—"}</strong>
          <small>First listed per paper</small>
        </div>
        <div className="dashboard-stat">
          <span className="stat-icon"><Lightbulb size={17} /></span>
          <span className="stat-label">POSSIBLE LEADS</span>
          <strong>{result ? signals.length : "—"}</strong>
          <small>Unverified abstract matches</small>
        </div>
        <div className="dashboard-stat">
          <span className="stat-icon"><Bookmark size={17} /></span>
          <span className="stat-label">SAVED PAPERS</span>
          <strong>{stateReady ? state.saved.length : "—"}</strong>
          <small>Entire local shortlist</small>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-panel breakdown-panel">
          <div className="dashboard-panel-head">
            <div>
              <div className="section-kicker">CURRENT RESULT SET</div>
              <h2>Recent papers by discipline</h2>
            </div>
            <button className="text-button" onClick={() => navigate("discover")}>
              Discover <ArrowRight size={15} />
            </button>
          </div>
          <p className="dashboard-hint">
            Each paper counted once under its first listed arXiv category, which may not reflect every discipline it belongs to.
          </p>
          {loading ? (
            <div className="dashboard-empty"><LoaderCircle className="spin" size={18} /> Loading the published snapshot…</div>
          ) : error ? (
            <div className="dashboard-empty" role="alert">
              <span>Couldn’t load papers: {error}</span>
              <button className="outline-button" onClick={retry}>Try again</button>
            </div>
          ) : !papers.length ? (
            <div className="dashboard-empty">No papers in this result set. Try a broader topic or date range.</div>
          ) : (
            <>
              <div className="breakdown-list">
                {visible.map((item) => (
                  <div className="breakdown-row" key={item.category}>
                    <div className="breakdown-label">
                      <span>
                        {topicName(item.category)}
                        <small>{topicName(item.category) !== item.category ? ` ${item.category}` : ""}</small>
                      </span>
                      <strong>{item.count}</strong>
                    </div>
                    <div className="bar-track" aria-hidden="true">
                      <div className="bar-fill" style={{ width: `${item.count / breakdown[0].count * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {remaining > 0 && (
                <p className="dashboard-hint">
                  Other categories: {remaining} papers across {breakdown.length - visible.length} categories.
                </p>
              )}
            </>
          )}
        </section>

        <section className="dashboard-panel saved-panel">
          <div className="dashboard-panel-head">
            <div>
              <div className="section-kicker">YOUR LIBRARY</div>
              <h2>Saved papers</h2>
            </div>
            <button className="text-button" onClick={() => navigate("saved")}>
              View all <ArrowRight size={15} />
            </button>
          </div>
          <p className="dashboard-hint">Your latest saved papers, independent of the current filters.</p>
          {!stateReady ? (
            <div className="dashboard-empty">Library is loading or unavailable. If it does not load, reload the page.</div>
          ) : !state.saved.length ? (
            <div className="dashboard-empty">Nothing saved yet. Bookmark a paper in Discover to start your shortlist.</div>
          ) : (
            <div className="dashboard-paper-list">
              {state.saved.slice(0, 3).map((paper) => (
                <button key={paper.id} className="dashboard-paper" onClick={() => openPaper(paper)}>
                  <span>
                    <strong>{paper.title}</strong>
                    <small>Submitted {date(paper.published)}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-panel leads-panel">
          <div className="dashboard-panel-head">
            <div>
              <div className="section-kicker">ABSTRACT-BASED LEADS</div>
              <h2>Possible research directions</h2>
            </div>
            <button className="text-button" onClick={() => navigate("problems")}>
              All signals <ArrowRight size={15} />
            </button>
          </div>
          <p className="dashboard-hint">
            Keyword-matched abstract sentences, not validated gaps. They may describe solved problems or be misclassified.
            No counter-search has been run for these leads; open a paper to investigate related work.
          </p>
          {loading ? (
            <div className="dashboard-empty"><LoaderCircle className="spin" size={18} /> Loading possible leads…</div>
          ) : error ? (
            <div className="dashboard-empty">Leads unavailable because the published snapshot could not be loaded.</div>
          ) : !signals.length ? (
            <div className="dashboard-empty">No matching problem language in these abstracts. This does not mean there are no open problems.</div>
          ) : (
            <div className="dashboard-leads">
              {signals.slice(0, 3).map((signal) => {
                const paper = lookup.get(signal.paperId);
                if (!paper) return null;
                return (
                  <article className="dashboard-lead" key={paper.id}>
                    <span className="tag">
                      {signal.kind === "future" ? "POSSIBLE FUTURE WORK" : "CHALLENGE MENTION"} · UNVERIFIED
                    </span>
                    <blockquote>“{signal.passage}”</blockquote>
                    <button className="dashboard-lead-title" onClick={() => openPaper(paper)}>
                      {paper.title} <ArrowUpRight size={14} />
                    </button>
                    <p>
                      {paper.authors.join(", ") || "Authors"} · submitted {date(paper.published)} · revised {date(paper.updated)} ·{" "}
                      <a href={paper.versionUrl} target="_blank" rel="noreferrer">
                        Source abstract <ArrowUpRight size={12} />
                      </a>
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}