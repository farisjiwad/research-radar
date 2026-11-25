import { Bookmark, CircleHelp, LoaderCircle, Search } from "lucide-react";
import { PaperCard } from "./PaperCard.js";
import { ProblemSummary } from "./ProblemSummary.js";
import type { Paper, Result, State, View } from "../types.js";

type PapersView = Extract<View, "discover" | "saved" | "problems">;

type PapersPageProps = {
  simpleView: boolean;
  view: PapersView;
  papers: Paper[];
  result: Result | null;
  limit: string;
  topic: string;
  loading: boolean;
  error: string;
  state: State;
  stateReady: boolean;
  savedIds: Set<string>;
  onRetry: () => void;
  onNavigate: (view: View) => void;
  onSave: (paper: Paper) => void;
  onFeedback: (paper: Paper, value: string) => void;
  onOpenPaper: (paper: Paper) => void;
};

export function PapersPage({
  simpleView,
  view,
  papers,
  result,
  limit,
  topic,
  loading,
  error,
  state,
  stateReady,
  savedIds,
  onRetry,
  onNavigate,
  onSave,
  onFeedback,
  onOpenPaper,
}: PapersPageProps) {
  const isSavedView = view === "saved";
  const title = isSavedView ? "Saved papers" : view === "problems" ? "Problem summary" : "Recent papers";
  const kicker = isSavedView ? "YOUR LIBRARY" : view === "problems" ? "ABSTRACT-BASED LEADS" : "EXPLORE THE LITERATURE";
  const count = isSavedView ? state.saved.length : result?.papers.length ?? "—";

  return (
    <>
      <div className="section-top">
        <div>
          <div className="section-kicker">{simpleView ? (isSavedView ? "SAVED" : view === "problems" ? "POSSIBLE LEADS" : "RECENT PAPERS") : kicker}</div>
          <h2>{title} <span className="result-count">{count}</span></h2>
        </div>
        {!simpleView && <div className="section-note">
          <span className="small-dot" /> {isSavedView ? "Stored on this device" : "Newest submissions first"}
        </div>}
      </div>

      {!isSavedView && !simpleView && (
        <div className="coverage compact-coverage">
          <span>
            {result
              ? `Updated ${new Date(result.fetchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC`
              : "Snapshot unavailable"}
            {` · Up to ${result?.limit ?? limit} papers`}
          </span>
          <button className="text-button" onClick={() => onNavigate("about")}>About data</button>
        </div>
      )}

      {!isSavedView && loading && (
        <div className="state-box">
          <LoaderCircle className="spin" size={25} />
          <strong>Loading the snapshot</strong>
          <p>Fetching the public dataset published with this site.</p>
        </div>
      )}

      {!isSavedView && error && (
        <div className="state-box state-error">
          <CircleHelp size={25} />
          <strong>Couldn’t load papers</strong>
          <p>{error}</p>
          <button className="outline-button" onClick={onRetry}>Try again</button>
        </div>
      )}

      {!isSavedView && !loading && !error && papers.length === 0 && (
        <div className="state-box">
          <Search size={25} />
          <strong>No papers found</strong>
          <p>{simpleView ? "Try another topic." : "Try a broader search, another topic, or a longer date range."}</p>
        </div>
      )}

      {isSavedView && stateReady && papers.length === 0 && (
        <div className="state-box">
          <Bookmark size={25} />
          <strong>Your shortlist is empty</strong>
          <p>{simpleView ? "Save papers with the bookmark button." : "Save a paper from Discover to keep it here for later."}</p>
          <button className="outline-button" onClick={() => onNavigate("discover")}>Explore papers</button>
        </div>
      )}

      {(isSavedView || (!loading && !error)) && papers.length > 0 && (
        view === "problems" ? (
          <ProblemSummary simpleView={simpleView} papers={papers} topic={topic} openPaper={onOpenPaper} />
        ) : (
          <div className="paper-list">
            {papers.map((paper, index) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                simpleView={simpleView}
                index={index}
                saved={savedIds.has(paper.id)}
                feedback={state.feedback[paper.id]}
                stateReady={stateReady}
                onSave={() => onSave(paper)}
                onFeedback={(value) => onFeedback(paper, value)}
                onOpen={() => onOpenPaper(paper)}
              />
            ))}
          </div>
        )
      )}
    </>
  );
}