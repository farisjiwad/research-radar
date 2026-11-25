import { useEffect, useMemo, useState } from "react";
import { makeBackup, loadState, parseBackup, saveState } from "./utils/storage.js";
import { filterSnapshot } from "./utils/snapshot.js";
import { prepareInvestigation } from "./utils/investigation.js";
import { AboutPage } from "./components/AboutPage.js";
import { Dashboard } from "./components/Dashboard.js";
import { InterestsDialog } from "./components/InterestsDialog.js";
import { PaperDetail } from "./components/PaperDetail.js";
import { PapersPage } from "./components/PapersPage.js";
import { WorkspaceLayout } from "./components/WorkspaceLayout.js";
import { message } from "./research.js";
import type { Density, Layout, Paper, Result, Snapshot, State, Theme, View } from "./types.js";

import "./style.css";

const themeOptions: Theme[] = ["field", "library", "moss", "ocean", "ember"];
const layoutOptions: Layout[] = ["standard", "wide", "reading"];
const densityOptions: Density[] = ["full", "balanced", "concise"];

function readPreferences() {
  try {
    const savedTheme = window.localStorage.getItem("research-radar-theme");
    const savedLayout = window.localStorage.getItem("research-radar-layout");
    const savedDensity = window.localStorage.getItem("research-radar-density");
    const theme: Theme = savedTheme === "dark"
      ? "moss"
      : savedTheme === "light"
        ? "field"
        : themeOptions.find((option) => option === savedTheme) || "field";
    const layout = layoutOptions.find((option) => option === savedLayout) || "standard";
    const density = densityOptions.find((option) => option === savedDensity) || "full";

    return { theme, layout, density, error: "" };
  } catch {
    return {
      theme: "field" as Theme,
      layout: "standard" as Layout,
      density: "full" as Density,
      error: "Could not read your saved view preferences. Your browser may block local storage.",
    };
  }
}

const pageCopy: Record<View, { title: string; description: string }> = {
  overview: {
    title: "Your research overview.",
    description: "A snapshot of recent work, your shortlist, and leads worth investigating.",
  },
  discover: {
    title: "Discover what’s next.",
    description: "A clearer view of what's happening across computer science.",
  },
  saved: {
    title: "Your reading shortlist.",
    description: "The papers you want to come back to, all in one place.",
  },
  problems: {
    title: "Potential problems, in context.",
    description: "A starting point for investigating challenges mentioned in recent abstracts.",
  },
  about: {
    title: "About Research Radar.",
    description: "How the data works and where your browser keeps it.",
  },
};

export function App() {
  const [view, setView] = useState<View>("overview");
  const [preferences] = useState(readPreferences);
  const [theme, setTheme] = useState(preferences.theme);
  const [layout, setLayout] = useState(preferences.layout);
  const [density, setDensity] = useState(preferences.density);
  const [state, setState] = useState<State>({ saved: [], interests: [], feedback: {} });
  const [stateReady, setStateReady] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [topic, setTopic] = useState("all");
  const [days, setDays] = useState("30");
  const [limit, setLimit] = useState("40");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState(preferences.error);
  const [retry, setRetry] = useState(0);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [analysis, setAnalysis] = useState<ReturnType<typeof prepareInvestigation> | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [interestsOpen, setInterestsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = ["moss", "ocean", "ember"].includes(theme) ? "dark" : "light";
    document.documentElement.dataset.design = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.layout = layout;
    document.documentElement.dataset.density = density;
  }, [layout, density]);

  useEffect(() => {
    try {
      setState(loadState(window.localStorage));
      setStateReady(true);
    } catch (error) {
      setActionError(`Could not load browser data: ${message(error)}. Import a backup or check browser storage; existing data was not overwritten.`);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSnapshot(null);

    fetch(new URL("data/papers.json", document.baseURI), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Snapshot unavailable (HTTP ${response.status}). Run npm run refresh-data and rebuild, or retry after the next Pages deployment.`);
        }

        const data: Snapshot = await response.json();
        const valid = data.version === 1
          && Array.isArray(data.papers)
          && Array.isArray(data.categories)
          && Number.isFinite(Date.parse(data.generatedAt))
          && typeof data.perCategoryLimit === "number";

        if (!valid) throw new Error("The published snapshot has an invalid format.");
        setSnapshot(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(message(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retry]);

  const result = useMemo<Result | null>(() => {
    if (!snapshot) return null;
    return {
      papers: filterSnapshot(snapshot, { topic, days, search: submittedSearch, limit }),
      query: submittedSearch,
      fetchedAt: snapshot.generatedAt,
      limit: Number(limit),
    };
  }, [snapshot, topic, days, submittedSearch, limit]);

  const savedIds = useMemo(() => new Set(state.saved.map((paper) => paper.id)), [state.saved]);
  const papers = view === "saved" ? state.saved : result?.papers || [];

  function persist(nextState: State) {
    saveState(window.localStorage, nextState);
    setState(nextState);
    setStateReady(true);
    setActionError("");
  }

  function savePaper(paper: Paper) {
    try {
      const saved = savedIds.has(paper.id)
        ? state.saved.filter((item) => item.id !== paper.id)
        : [{ ...paper, savedAt: new Date().toISOString() }, ...state.saved];
      persist({ ...state, saved });
    } catch (error) {
      setActionError(`Could not update your shortlist: ${message(error)}. Check browser storage and export a backup.`);
    }
  }

  function toggleInterest(code: string) {
    const interests = state.interests.includes(code)
      ? state.interests.filter((id) => id !== code)
      : [...state.interests, code];

    try {
      persist({ ...state, interests });
    } catch (error) {
      setActionError(`Could not save your interests: ${message(error)}`);
    }
  }

  function setFeedback(paper: Paper, value: string) {
    const feedback = { ...state.feedback };
    if (feedback[paper.id] === value) delete feedback[paper.id];
    else feedback[paper.id] = value;

    try {
      persist({ ...state, feedback });
    } catch (error) {
      setActionError(`Could not save feedback: ${message(error)}`);
    }
  }

  function exportBackup() {
    try {
      const backup = new Blob([JSON.stringify(makeBackup(state), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(backup);
      const link = document.createElement("a");
      link.href = url;
      link.download = "research-radar-backup.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setActionError(`Could not export backup: ${message(error)}`);
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;

    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds 10 MB.");
      const imported = parseBackup(JSON.parse(await file.text()));
      const confirmed = window.confirm(
        "Replace this browser’s saved papers, interests, and feedback with the backup? Export the current data first if you need to keep it.",
      );
      if (confirmed) persist(imported);
    } catch (error) {
      setActionError(`Could not import backup: ${message(error)}. Existing data was not changed.`);
    }
  }

  function changePreference<T extends string>(
    key: string,
    value: T,
    update: (next: T) => void,
    label: string,
  ) {
    update(value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      setActionError(`Could not save your ${label} preference. It will reset when you reload.`);
    }
  }

  function openPaper(paper: Paper) {
    setSelectedPaper(paper);
    setAnalysis(null);
    setAnalysisError("");
  }

  function analyzePaper() {
    if (!selectedPaper) return;
    try {
      setAnalysis(prepareInvestigation(selectedPaper));
      setAnalysisError("");
    } catch (error) {
      setAnalysisError(message(error));
    }
  }

  function selectInterest(code: string) {
    setTopic(code);
    setView(view === "overview" || view === "problems" ? view : "discover");
  }

  const { title, description } = pageCopy[view];
  const papersView = view === "discover" || view === "saved" || view === "problems";

  return (
    <WorkspaceLayout
      view={view}
      title={title}
      description={description}
      savedCount={state.saved.length}
      interests={state.interests}
      topic={topic}
      days={days}
      limit={limit}
      search={search}
      theme={theme}
      layout={layout}
      density={density}
      actionError={actionError}
      snapshotStatus={error ? "Snapshot unavailable" : result ? "Snapshot loaded" : "Loading snapshot"}
      onNavigate={setView}
      onManageInterests={() => setInterestsOpen(true)}
      onSelectInterest={selectInterest}
      onTopicChange={setTopic}
      onDaysChange={setDays}
      onLimitChange={setLimit}
      onSearchChange={setSearch}
      onSearchSubmit={() => setSubmittedSearch(search.trim())}
      onThemeChange={(value) => changePreference("research-radar-theme", value as Theme, setTheme, "appearance")}
      onLayoutChange={(value) => changePreference("research-radar-layout", value as Layout, setLayout, "layout")}
      onDensityChange={(value) => changePreference("research-radar-density", value as Density, setDensity, "text density")}
      onDismissError={() => setActionError("")}
    >
      {view === "about" && (
        <AboutPage
          snapshot={snapshot}
          stateReady={stateReady}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />
      )}

      {view === "overview" && (
        <Dashboard
          result={result}
          loading={loading}
          error={error}
          retry={() => setRetry((count) => count + 1)}
          state={state}
          stateReady={stateReady}
          navigate={setView}
          openPaper={openPaper}
        />
      )}

      {papersView && (
        <PapersPage
          view={view}
          papers={papers}
          result={result}
          limit={limit}
          topic={topic}
          loading={loading}
          error={error}
          state={state}
          stateReady={stateReady}
          savedIds={savedIds}
          onRetry={() => setRetry((count) => count + 1)}
          onNavigate={setView}
          onSave={savePaper}
          onFeedback={setFeedback}
          onOpenPaper={openPaper}
        />
      )}

      {selectedPaper && (
        <PaperDetail
          paper={selectedPaper}
          saved={savedIds.has(selectedPaper.id)}
          stateReady={stateReady}
          analysis={analysis}
          analysisError={analysisError}
          onClose={() => setSelectedPaper(null)}
          onSave={() => savePaper(selectedPaper)}
          onAnalyze={analyzePaper}
        />
      )}

      {interestsOpen && (
        <InterestsDialog
          interests={state.interests}
          stateReady={stateReady}
          onToggle={toggleInterest}
          onClose={() => setInterestsOpen(false)}
        />
      )}
    </WorkspaceLayout>
  );
}