import { Check, X } from "lucide-react";
import { topics } from "../research.js";

type InterestsDialogProps = {
  interests: string[];
  stateReady: boolean;
  onToggle: (code: string) => void;
  onClose: () => void;
};

export function InterestsDialog({ interests, stateReady, onToggle, onClose }: InterestsDialogProps) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className="modal interests-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interests-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close" aria-label="Close" onClick={onClose}><X size={20} /></button>
        <div className="section-kicker">MAKE IT YOURS</div>
        <h2 id="interests-title">Your research interests</h2>
        <p>
          Choose the areas you follow. These are stored locally and appear in your workspace; select one to filter
          discovery. Autonomous systems is a broad proxy covering robotics, multiagent systems, and systems &amp; control.
        </p>
        <div className="interest-grid">
          {topics.map(([id, name]) => {
            const selected = interests.includes(id);
            const category = id === "autonomous"
              ? "cs.RO · cs.MA · eess.SY (broad proxy)"
              : id === "cs.SY" ? "eess.SY" : id === "cs.TH" ? "cs.CC" : id;

            return (
              <button
                disabled={!stateReady}
                key={id}
                className={selected ? "interest-choice selected" : "interest-choice"}
                onClick={() => onToggle(id)}
              >
                <span>{name}<small>{category}</small></span>
                {selected && <Check size={16} />}
              </button>
            );
          })}
        </div>
        <button className="primary-button" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}