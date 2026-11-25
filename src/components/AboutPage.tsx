import { useRef } from "react";
import type { Snapshot } from "../types.js";

type AboutPageProps = {
  simpleView: boolean;
  snapshot: Snapshot | null;
  stateReady: boolean;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => Promise<void>;
};

export function AboutPage({ simpleView, snapshot, stateReady, onExportBackup, onImportBackup }: AboutPageProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const refreshedAt = snapshot
    ? new Date(snapshot.generatedAt).toISOString().replace("T", " ").slice(0, 16)
    : null;

  async function importBackup(file: File | undefined) {
    try {
      await onImportBackup(file);
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  return (
    <section className="about-page" aria-label="About Research Radar">
      <section className="about-section">
        <div className="section-kicker">DATA &amp; COVERAGE</div>
        <h2>A focused snapshot, not a complete index</h2>
        <p>{simpleView ? "Research Radar shows recent arXiv papers from a limited snapshot, not a live search of all arXiv." : "Research Radar is a public site that publishes arXiv paper metadata. It loads a static snapshot, not a live search of all arXiv."}</p>
        <p>
          {simpleView
            ? `The snapshot includes up to ${snapshot?.perCategoryLimit ?? 200} recent papers per indexed category. Older papers and categories outside the snapshot may be missing.`
            : <>The snapshot includes up to {snapshot?.perCategoryLimit ?? 200} recent records per indexed category. Topic, date,
              and text filters only search records in that snapshot, so older papers and papers outside indexed categories may
              be missing. The overview assigns each paper to its first listed category for counting. Autonomous systems is a
              broad proxy across robotics, multiagent systems, and systems &amp; control.</>}
        </p>
        <p>{refreshedAt ? `Current snapshot refreshed ${refreshedAt} UTC.` : "The snapshot timestamp is unavailable until data loads."}</p>
      </section>

      <section className="about-section">
        <div className="section-kicker">YOUR BROWSER DATA</div>
        <h2>Saved papers stay on this device</h2>
        <p>
          {simpleView
            ? "Your saved papers, interests, and feedback stay in this browser and do not sync. Anyone using this browser profile can see them, and clearing site data may delete them. Preferences are not included in backups."
            : "Your shortlist, interests, and relevance feedback are stored in this browser. They do not sync across devices. Anyone with access to this browser profile can read them, and clearing site data may delete them. Appearance and view preferences are also browser-local and are not included in backups."}
        </p>
      </section>

      <section className="about-section">
        <div className="section-kicker">BACKUP &amp; MIGRATION</div>
        <h2>Export or restore your research data</h2>
        <p>
          {simpleView
            ? "Export a JSON backup. Import replaces saved papers, interests, and feedback after confirmation. Export first to keep your current data."
            : "Export downloads a private JSON backup. Import validates a backup and, after confirmation, replaces this browser’s saved papers, interests, and feedback. Export first if you need to keep what is here."}
        </p>
        <div className="about-actions">
          <button className="outline-button" disabled={!stateReady} onClick={onExportBackup}>Export backup</button>
          <button className="outline-button" onClick={() => importRef.current?.click()}>Import backup</button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => importBackup(event.target.files?.[0])}
          />
        </div>
      </section>
    </section>
  );
}