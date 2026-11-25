import { Bookmark, BookmarkCheck, CircleHelp, ExternalLink, FileText, FlaskConical, Lightbulb, Sparkles, X } from "lucide-react";
import { date } from "../research.js";
import type { Opportunity, Paper } from "../types.js";

type PaperDetailProps = {
  paper: Paper;
  saved: boolean;
  stateReady: boolean;
  analysis: Opportunity | null;
  analysisError: string;
  onClose: () => void;
  onSave: () => void;
  onAnalyze: () => void;
};

export function PaperDetail({ paper, saved, stateReady, analysis, analysisError, onClose, onSave, onAnalyze }: PaperDetailProps) {
  return (
    <div className="overlay panel-overlay" onMouseDown={onClose}>
      <div
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paper-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-top">
          <span><FileText size={17} /> PAPER DETAILS</span>
          <button className="close static" aria-label="Close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="panel-content">
          <div className="tags">
            {paper.categories.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
          </div>
          <h2 id="paper-title">{paper.title}</h2>
          <p className="detail-authors">{paper.authors.join(", ")}</p>
          <div className="detail-dates">
            <span>FIRST SUBMITTED<strong>{date(paper.published)}</strong></span>
            <span>LATEST REVISION<strong>{date(paper.updated)}</strong></span>
          </div>
          <div className="detail-actions">
            <a className="primary-button" href={paper.versionUrl} target="_blank" rel="noreferrer">
              Read on arXiv <ExternalLink size={15} />
            </a>
            <button className="outline-button" disabled={!stateReady} onClick={onSave}>
              {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {saved ? "Saved" : "Save paper"}
            </button>
          </div>

          <section className="detail-section">
            <div className="section-kicker">FROM THE AUTHORS</div>
            <h3>Abstract</h3>
            <p className="abstract">{paper.abstract}</p>
          </section>

          <section className="detail-section opportunity-section">
            <div className="opportunity-heading">
              <div className="intro-icon"><Lightbulb size={19} /></div>
              <div>
                <div className="section-kicker">EVIDENCE, NOT ANSWERS</div>
                <h3>Explore a research direction</h3>
              </div>
            </div>
            <p>
              Prepare an abstract-based lead and a link for a manual arXiv search. This is a simple heuristic, not AI or
              full-text analysis; no counter-search runs automatically.
            </p>
            <button className="primary-button" onClick={onAnalyze}>
              <Sparkles size={16} /> {analysis ? "Prepare again" : "Prepare investigation"}
            </button>
            {analysisError && <div className="notice error" role="alert">{analysisError}</div>}
            {analysis && <OpportunityCard analysis={analysis} />}
          </section>
        </div>
      </div>
    </div>
  );
}

function OpportunityCard({ analysis }: { analysis: Opportunity }) {
  return (
    <div className="opportunity-card">
      <div className="opportunity-label">
        <FlaskConical size={14} /> {analysis.kind.toUpperCase()} <span>HEURISTIC</span>
      </div>
      <h4>{analysis.title}</h4>
      <p>{analysis.direction}</p>
      <div className="evidence-label">SUPPORTING PASSAGE · ABSTRACT ONLY</div>
      <blockquote>“{analysis.passage}”</blockquote>
      <a href={analysis.evidenceUrl} target="_blank" rel="noreferrer">
        {analysis.attribution} · revised {date(analysis.evidenceDate)} <ExternalLink size={13} />
      </a>
      <div className="related">
        <div className="evidence-label">MANUAL RELATED-WORK SEARCH</div>
        <p>
          No automated counter-search has been performed. Open the arXiv search and review results yourself; suggested
          terms: <strong>{analysis.terms.join(", ") || "paper title"}</strong>. Broaden the terms and check other sources.
        </p>
        <a className="related-paper" href={analysis.searchUrl} target="_blank" rel="noreferrer">
          Search arXiv manually <ExternalLink size={14} />
        </a>
      </div>
      <div className="uncertainty">
        <CircleHelp size={15} />
        <span>Uncertainty: only one abstract was examined; full text, reviews, and related work have not been assessed. No novelty claim is made.</span>
      </div>
    </div>
  );
}