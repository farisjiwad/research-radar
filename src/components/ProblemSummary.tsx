import { ArrowRight, CircleHelp, ExternalLink, Lightbulb, Search } from "lucide-react";
import { extractProblemSignals } from "../utils/problemSignals.js";
import { date, topicName } from "../research.js";
import type { Paper } from "../types.js";

type ProblemSummaryProps = {
  papers: Paper[];
  topic: string;
  openPaper: (paper: Paper) => void;
};

export function ProblemSummary({ papers, topic, openPaper }: ProblemSummaryProps) {
  const signals = extractProblemSignals(papers);
  const future = signals.filter((signal) => signal.kind === "future").length;
  const papersById = new Map(papers.map((paper) => [paper.id, paper]));

  return (
    <div className="problem-summary">
      <div className="digest-intro">
        <div className="intro-icon"><Lightbulb size={20} /></div>
        <div>
          <strong>
            {topic === "all" ? "All computer science" : topicName(topic)}: {signals.length} possible leads in {papers.length} recent papers
          </strong>
          <p>
            {future} possible future-work or open-question mentions; {signals.length - future} challenge or limitation
            mentions.
          </p>
        </div>
      </div>

      {!signals.length ? (
        <div className="state-box">
          <Search size={25} />
          <strong>No matching problem language found</strong>
          <p>Try a longer date range or another topic. The heuristic misses many problems; no matches do not mean there are none.</p>
        </div>
      ) : (
        <div className="problem-list">
          {signals.map((signal) => {
            const paper = papersById.get(signal.paperId);
            if (!paper) return null;

            return (
              <article className="problem-card" key={paper.id}>
                <div className="paper-meta">
                  <span className="tag">
                    {signal.kind === "future" ? "POSSIBLE OPEN QUESTION / FUTURE WORK" : "CHALLENGE / LIMITATION MENTION"}
                  </span>
                </div>
                <blockquote>“{signal.passage}”</blockquote>
                <button className="paper-title" onClick={() => openPaper(paper)}>{paper.title}</button>
                <p className="authors">
                  {paper.authors.join(", ") || "Authors"} · first submitted {date(paper.published)} · revised {date(paper.updated)}
                </p>
                <div className="problem-actions">
                  <a href={paper.versionUrl} target="_blank" rel="noreferrer">
                    Source abstract <ExternalLink size={13} />
                  </a>
                  <button className="text-button" onClick={() => openPaper(paper)}>
                    Open paper to investigate <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}