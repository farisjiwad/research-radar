import { ArrowRight, Bookmark, BookmarkCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { compactAuthors, date } from "../research.js";
import type { Paper } from "../types.js";

type PaperCardProps = {
  paper: Paper;
  simpleView: boolean;
  index: number;
  saved: boolean;
  feedback?: string;
  stateReady: boolean;
  onSave: () => void;
  onFeedback: (value: string) => void;
  onOpen: () => void;
};

export function PaperCard({ paper, simpleView, index, saved, feedback, stateReady, onSave, onFeedback, onOpen }: PaperCardProps) {
  const authorText = simpleView ? compactAuthors(paper.authors) : paper.authors.slice(0, 4).join(", ");
  const extraAuthors = !simpleView && paper.authors.length > 4 ? ` +${paper.authors.length - 4} more` : "";
  const revised = paper.updated.slice(0, 10) !== paper.published.slice(0, 10);

  return (
    <article className="paper-card">
      <div className="paper-number">{String(index + 1).padStart(2, "0")}</div>
      <div className="paper-body">
        <div className="paper-meta">
          <span className="tag">{paper.categories[0] || "arXiv"}</span>
          {!simpleView && <span>SUBMITTED {date(paper.published).toUpperCase()}</span>}
          {!simpleView && revised && <span>REVISED {date(paper.updated).toUpperCase()}</span>}
        </div>
        <button className="paper-title" onClick={onOpen}>{paper.title}</button>
        <p className="authors">{authorText}{extraAuthors}</p>
        <p className="paper-abstract">{paper.abstract}</p>
        <div className="paper-bottom">
          <button className="text-button" onClick={onOpen}>
            View paper <ArrowRight size={15} />
          </button>
          <div className="paper-controls">
            <span>Relevant?</span>
            <button
              disabled={!stateReady}
              className={feedback === "relevant" ? "icon-button chosen" : "icon-button"}
              aria-label="Mark relevant"
              aria-pressed={feedback === "relevant"}
              onClick={() => onFeedback("relevant")}
            >
              <ThumbsUp size={15} />
            </button>
            <button
              disabled={!stateReady}
              className={feedback === "not-relevant" ? "icon-button chosen" : "icon-button"}
              aria-label="Mark not relevant"
              aria-pressed={feedback === "not-relevant"}
              onClick={() => onFeedback("not-relevant")}
            >
              <ThumbsDown size={15} />
            </button>
          </div>
        </div>
      </div>
      <button
        className={saved ? "save-button saved" : "save-button"}
        disabled={!stateReady}
        aria-label={saved ? "Remove from shortlist" : "Save to shortlist"}
        onClick={onSave}
      >
        {saved ? <BookmarkCheck size={19} /> : <Bookmark size={19} />}
      </button>
    </article>
  );
}