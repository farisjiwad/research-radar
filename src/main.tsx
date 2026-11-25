import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, BookmarkCheck, BookOpen, Check, ChevronDown, CircleHelp, Compass, ExternalLink, FileText, Filter, FlaskConical, LayoutDashboard, Layers2, Lightbulb, LoaderCircle, Menu, Moon, Search, Settings2, Sparkles, Sun, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { extractProblemSignals } from "./problemSignals.js";
import { categoryBreakdown } from "./dashboardData.js";
import { loadState, saveState, makeBackup, parseBackup } from "./storage.js";
import { filterSnapshot } from "./snapshot.js";
import { prepareInvestigation } from "./investigation.js";
import "./style.css";

type Paper = { id: string; title: string; abstract: string; authors: string[]; published: string; updated: string; categories: string[]; url: string; versionUrl: string; savedAt?: string };
type Feedback = Record<string, string>;
type State = { saved: Paper[]; interests: string[]; feedback: Feedback };
type Snapshot = { version: number; generatedAt: string; perCategoryLimit: number; categories: string[]; papers: Paper[] };
type Result = { papers: Paper[]; query: string; fetchedAt: string; limit: number };
type Opportunity = ReturnType<typeof prepareInvestigation>;
type View = "overview" | "discover" | "saved" | "digest" | "problems";

const topics = [
  ["cs.AI", "Artificial intelligence"], ["cs.LG", "Machine learning"], ["cs.CL", "Computation & language"],
  ["cs.CV", "Computer vision"], ["cs.CR", "Cryptography & security"], ["cs.SE", "Software engineering"],
  ["cs.HC", "Human-computer interaction"], ["cs.RO", "Robotics"], ["cs.OS", "Operating systems"], ["autonomous", "Autonomous systems"], ["cs.DB", "Databases"],
  ["cs.DC", "Distributed computing"], ["cs.PL", "Programming languages"], ["cs.IR", "Information retrieval"],
  ["cs.NE", "Neural & evolutionary computing"], ["cs.SY", "Systems & control"], ["cs.TH", "Theory"],
] as const;
const topicName = (code: string) => code === "eess.SY" ? "Systems & control" : code === "cs.CC" ? "Theory" : topics.find(([id]) => id === code)?.[1] || code;
const topicMatches = (paper: Paper, code: string) => code === "autonomous"
  ? paper.categories.some((category) => ["cs.RO", "cs.MA", "eess.SY"].includes(category))
  : paper.categories.includes(code === "cs.SY" ? "eess.SY" : code === "cs.TH" ? "cs.CC" : code);
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";

function App() {
  const [view, setView] = useState<View>("overview");
  const [themeState] = useState(() => {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const saved = window.localStorage.getItem("research-radar-theme");
      return { theme: saved === "dark" || saved === "light" ? saved : systemTheme, error: "" };
    } catch {
      return { theme: systemTheme, error: "Could not read the saved appearance preference. Your browser may block local storage." };
    }
  });
  const [theme, setTheme] = useState(themeState.theme);
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
  const [actionError, setActionError] = useState(themeState.error);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Paper | null>(null);
  const [analysis, setAnalysis] = useState<Opportunity | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { window.localStorage.setItem("research-radar-theme", next); }
    catch { setActionError("Could not save your appearance preference. It will reset when you reload."); }
  }

  useEffect(() => {
    try { setState(loadState(window.localStorage)); setStateReady(true); }
    catch (err) { setActionError(`Could not load browser data: ${message(err)}. Import a backup or check browser storage; existing data was not overwritten.`); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setSnapshot(null);
    fetch(new URL("data/papers.json", document.baseURI), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Snapshot unavailable (HTTP ${response.status}). Run npm run refresh-data and rebuild, or retry after the next Pages deployment.`);
        const data: Snapshot = await response.json();
        if (data.version !== 1 || !Array.isArray(data.papers) || !Array.isArray(data.categories) || !Number.isFinite(Date.parse(data.generatedAt)) || typeof data.perCategoryLimit !== "number") throw new Error("The published snapshot has an invalid format.");
        setSnapshot(data);
      }).catch((err) => { if (!controller.signal.aborted) setError(message(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const result = useMemo<Result | null>(() => snapshot ? { papers: filterSnapshot(snapshot, { topic, days, search: submittedSearch, limit }), query: submittedSearch, fetchedAt: snapshot.generatedAt, limit: Number(limit) } : null, [snapshot, topic, days, submittedSearch, limit]);

  const savedIds = useMemo(() => new Set(state.saved.map((paper) => paper.id)), [state.saved]);
  const papers = view === "saved" ? state.saved : result?.papers || [];
  function persist(next: State) {
    saveState(window.localStorage, next);
    setState(next); setStateReady(true); setActionError("");
  }
  function save(paper: Paper) {
    try { persist({ ...state, saved: savedIds.has(paper.id) ? state.saved.filter((p) => p.id !== paper.id) : [{ ...paper, savedAt: new Date().toISOString() }, ...state.saved] }); }
    catch (err) { setActionError(`Could not update your shortlist: ${message(err)}. Check browser storage and export a backup.`); }
  }
  function interest(code: string) {
    const interests = state.interests.includes(code) ? state.interests.filter((id) => id !== code) : [...state.interests, code];
    try { persist({ ...state, interests }); }
    catch (err) { setActionError(`Could not save your interests: ${message(err)}`); }
  }
  function feedback(paper: Paper, value: string) {
    const updated = { ...state.feedback };
    if (updated[paper.id] === value) delete updated[paper.id]; else updated[paper.id] = value;
    try { persist({ ...state, feedback: updated }); }
    catch (err) { setActionError(`Could not save feedback: ${message(err)}`); }
  }
  function exportBackup() {
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(makeBackup(state), null, 2)], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "research-radar-backup.json"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setActionError(`Could not export backup: ${message(err)}`); }
  }
  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Backup exceeds 10 MB.");
      const imported = parseBackup(JSON.parse(await file.text()));
      if (!window.confirm("Replace this browser’s saved papers, interests, and feedback with the backup? Export the current data first if you need to keep it.")) return;
      persist(imported);
    } catch (err) { setActionError(`Could not import backup: ${message(err)}. Existing data was not changed.`); }
    finally { if (importRef.current) importRef.current.value = ""; }
  }
  function analyze(paper: Paper) { try { setAnalysis(prepareInvestigation(paper)); setAnalysisError(""); } catch (err) { setAnalysisError(message(err)); } }
  function openPaper(paper: Paper) { setSelected(paper); setAnalysis(null); setAnalysisError(""); }
  function closePaper() { setSelected(null); }
  function navigate(next: View) { setView(next); setMobileMenu(false); }
  const nav = <nav aria-label="Main navigation">
    <span className="nav-heading">WORKSPACE</span>
    <button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => navigate("overview")}><LayoutDashboard size={18} /> Overview</button>
    <button className={view === "discover" ? "nav-item active" : "nav-item"} onClick={() => navigate("discover")}><Compass size={18} /> Discover <ArrowRight className="nav-arrow" size={15}/></button>
    <button className={view === "problems" ? "nav-item active" : "nav-item"} onClick={() => navigate("problems")}><Lightbulb size={18} /> Problem signals</button>
    <button className={view === "saved" ? "nav-item active" : "nav-item"} onClick={() => navigate("saved")}><Bookmark size={18} /> Shortlist <span className="nav-count">{state.saved.length}</span></button>
    <button className={view === "digest" ? "nav-item active" : "nav-item"} onClick={() => navigate("digest")}><Layers2 size={18} /> Digest</button>
    <div className="nav-divider" />
    <div className="nav-heading interests-heading">YOUR INTERESTS <button aria-label="Manage interests" onClick={() => setInterestsOpen(true)}><Settings2 size={15}/></button></div>
    {state.interests.length ? state.interests.map((code) => <button key={code} className="interest-link" onClick={() => { setTopic(code); navigate(view === "overview" || view === "problems" || view === "digest" ? view : "discover"); }}><span className="interest-dot"/>{topicName(code)}</button>) : <button className="add-interests" onClick={() => setInterestsOpen(true)}>+ Add research interests</button>}
  </nav>;
  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>research radar</strong><span>YOUR RESEARCH COMPASS</span></div></div>
      {nav}
      <div className="sidebar-bottom"><div className="avatar">R</div><div><strong>Research workspace</strong><span>Browser-local data</span></div><span className="online-dot"/></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="breadcrumbs">Workspace <span>/</span> <strong>{view === "overview" ? "Overview" : view === "discover" ? "Discover" : view === "saved" ? "Shortlist" : view === "problems" ? "Problem signals" : "Digest"}</strong></div><div className="top-right"><span className="live-dot"/> <span>{error ? "Snapshot unavailable" : result ? "Snapshot loaded" : "Loading snapshot"}</span><span className="top-divider"/><button className="theme-toggle" onClick={toggleTheme} aria-label="Dark mode" aria-pressed={theme === "dark"} title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button><span className="top-avatar">R</span></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR RESEARCH RADAR</div><h1>{view === "overview" ? "Your research overview." : view === "discover" ? "Discover what’s next." : view === "saved" ? "Your reading shortlist." : view === "problems" ? "Potential problems, in context." : "Your research digest."}</h1><p>{view === "overview" ? "A snapshot of recent work, your shortlist, and leads worth investigating." : view === "discover" ? "A clearer view of what's happening across computer science." : view === "saved" ? "The papers you want to come back to, all in one place." : view === "problems" ? "A starting point for investigating challenges mentioned in recent abstracts." : "A focused snapshot of the latest papers in your current search."}</p></div><button className="outline-button heading-button" onClick={() => setInterestsOpen(true)}><Settings2 size={16}/> Manage interests</button></div>
        {actionError && <div className="notice error" role="alert">{actionError}<button onClick={() => setActionError("")} aria-label="Dismiss error"><X size={16}/></button></div>}
        <div className="backup-tools"><span>Public site · Personal data stays in this browser, not private from other users of it. Back it up before clearing browser data. Migrating from the earlier local app? Export its SQLite data using the README, then import here.</span><button className="outline-button" disabled={!stateReady} onClick={exportBackup}>Export backup</button><button className="outline-button" onClick={() => importRef.current?.click()}>Import backup</button><input ref={importRef} type="file" accept=".json,application/json" hidden onChange={(event) => importBackup(event.target.files?.[0])}/></div>
        {view === "discover" && <div className="intro-banner"><div className="intro-icon"><Sparkles size={20}/></div><div><strong>Find signals, not just papers.</strong><p>Explore recent work, save what matters, and investigate potential research directions with evidence.</p></div><span className="banner-label">BUILT FOR CURIOSITY <ArrowUpRight size={14}/></span></div>}
        {view !== "saved" && <div className="filters">
          <form className="search-box" onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search.trim()); }}><Search size={18}/><input aria-label="Search papers" placeholder="Search papers, topics, or keywords..." value={search} onChange={(event) => setSearch(event.target.value)}/><button type="submit">Search</button></form>
          <div className="select-wrap"><Filter size={16}/><select aria-label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)}><option value="all">All CS topics</option>{topics.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select><ChevronDown size={14}/></div>
          <div className="select-wrap date-select"><select aria-label="Date range" value={days} onChange={(event) => setDays(event.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select><ChevronDown size={14}/></div>
          <div className="select-wrap"><select aria-label="Maximum results" value={limit} onChange={(event) => setLimit(event.target.value)}><option value="40">Up to 40 papers</option><option value="100">Up to 100 papers</option><option value="200">Up to 200 papers</option></select><ChevronDown size={14}/></div>
        </div>}
        {view === "overview" ? <Dashboard result={result} loading={loading} error={error} retry={() => setRetry((x) => x + 1)} state={state} stateReady={stateReady} topic={topic} days={days} search={submittedSearch} limit={limit} navigate={navigate} openPaper={openPaper}/> : <>
        <div className="section-top"><div><div className="section-kicker">{view === "saved" ? "YOUR LIBRARY" : view === "digest" ? "THE LATEST" : view === "problems" ? "ABSTRACT-BASED LEADS" : "EXPLORE THE LITERATURE"}</div><h2>{view === "saved" ? "Saved papers" : view === "digest" ? "Recent developments" : view === "problems" ? "Problem summary" : "Recent papers"} <span className="result-count">{view === "saved" ? state.saved.length : result ? result.papers.length : "—"}</span></h2></div><div className="section-note"><span className="small-dot"/> {view === "saved" ? "Stored on this device" : "Newest submissions first"}</div></div>
        {view !== "saved" && <div className="coverage"><CircleHelp size={15}/><span>Static arXiv snapshot · Up to {result?.limit ?? limit} displayed · {result ? `Refreshed ${new Date(result.fetchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC` : "No snapshot loaded"} · Latest {snapshot?.perCategoryLimit ?? 200} per indexed category, not comprehensive{topic === "autonomous" ? " · Autonomous systems is a broad proxy: cs.RO, cs.MA, eess.SY" : ""}</span></div>}
        {view !== "saved" && loading && <div className="state-box"><LoaderCircle className="spin" size={25}/><strong>Loading the snapshot</strong><p>Fetching the public dataset published with this site.</p></div>}
        {view !== "saved" && error && <div className="state-box state-error"><CircleHelp size={25}/><strong>Couldn’t load papers</strong><p>{error}</p><button className="outline-button" onClick={() => setRetry((x) => x + 1)}>Try again</button></div>}
        {!loading && !error && view !== "saved" && papers.length === 0 && <div className="state-box"><Search size={25}/><strong>No papers found</strong><p>Try a broader search, another topic, or a longer date range.</p></div>}
        {view === "saved" && stateReady && papers.length === 0 && <div className="state-box"><Bookmark size={25}/><strong>Your shortlist is empty</strong><p>Save a paper from Discover to keep it here for later.</p><button className="outline-button" onClick={() => setView("discover")}>Explore papers <ArrowRight size={15}/></button></div>}
        {(view === "saved" || (!loading && !error)) && papers.length > 0 && (view === "digest"
          ? <Digest papers={papers} interests={state.interests} openPaper={openPaper}/>
          : view === "problems" ? <ProblemSummary papers={papers} topic={topic} openPaper={openPaper}/>
          : <div className="paper-list">{papers.map((paper, index) => <PaperCard key={paper.id} paper={paper} index={index} saved={savedIds.has(paper.id)} feedback={state.feedback[paper.id]} onSave={() => save(paper)} onFeedback={(value) => feedback(paper, value)} onOpen={() => openPaper(paper)} stateReady={stateReady}/>)}</div>)}
        </>}
        <footer><span><Activity size={15}/> Research Radar <span className="footer-divider">/</span> A more thoughtful way to explore.</span><span>Made for curious minds <span className="footer-star">✳</span></span></footer>
      </div>
    </main>
    {interestsOpen && <div className="overlay" onMouseDown={() => setInterestsOpen(false)}><div className="modal interests-modal" role="dialog" aria-modal="true" aria-labelledby="interests-title" onMouseDown={(e) => e.stopPropagation()}><button className="close" aria-label="Close" onClick={() => setInterestsOpen(false)}><X size={20}/></button><div className="section-kicker">MAKE IT YOURS</div><h2 id="interests-title">Your research interests</h2><p>Choose the areas you follow. These are stored locally and appear in your workspace; select one to filter discovery. Autonomous systems is a broad proxy covering robotics, multiagent systems, and systems &amp; control.</p><div className="interest-grid">{topics.map(([id, name]) => <button disabled={!stateReady} key={id} className={state.interests.includes(id) ? "interest-choice selected" : "interest-choice"} onClick={() => interest(id)}><span>{name}<small>{id === "autonomous" ? "cs.RO · cs.MA · eess.SY (broad proxy)" : id === "cs.SY" ? "eess.SY" : id === "cs.TH" ? "cs.CC" : id}</small></span>{state.interests.includes(id) && <Check size={16}/>}</button>)}</div><button className="primary-button" onClick={() => setInterestsOpen(false)}>Done</button></div></div>}
    {selected && <div className="overlay panel-overlay" onMouseDown={closePaper}><div className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="paper-title" onMouseDown={(e) => e.stopPropagation()}><div className="panel-top"><span><FileText size={17}/> PAPER DETAILS</span><button className="close static" aria-label="Close" onClick={closePaper}><X size={20}/></button></div><div className="panel-content"><div className="tags">{selected.categories.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div><h2 id="paper-title">{selected.title}</h2><p className="detail-authors">{selected.authors.join(", ")}</p><div className="detail-dates"><span>FIRST SUBMITTED<strong>{date(selected.published)}</strong></span><span>LATEST REVISION<strong>{date(selected.updated)}</strong></span></div><div className="detail-actions"><a className="primary-button" href={selected.versionUrl} target="_blank" rel="noreferrer">Read on arXiv <ExternalLink size={15}/></a><button className="outline-button" disabled={!stateReady} onClick={() => save(selected)}>{savedIds.has(selected.id) ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>} {savedIds.has(selected.id) ? "Saved" : "Save paper"}</button></div><div className="detail-section"><div className="section-kicker">FROM THE AUTHORS</div><h3>Abstract</h3><p className="abstract">{selected.abstract}</p></div><div className="detail-section opportunity-section"><div className="opportunity-heading"><div className="intro-icon"><Lightbulb size={19}/></div><div><div className="section-kicker">EVIDENCE, NOT ANSWERS</div><h3>Explore a research direction</h3></div></div><p>Prepare an abstract-based lead and a link for a manual arXiv search. This is a simple heuristic, not AI or full-text analysis; no counter-search runs automatically.</p><button className="primary-button" onClick={() => analyze(selected)}><Sparkles size={16}/> {analysis ? "Prepare again" : "Prepare investigation"}</button>{analysisError && <div className="notice error" role="alert">{analysisError}</div>}{analysis && <OpportunityCard analysis={analysis}/>}</div></div></div></div>}
  </div>;
}

function Dashboard({ result, loading, error, retry, state, stateReady, topic, days, search, limit, navigate, openPaper }: {
  result: Result | null; loading: boolean; error: string; retry: () => void; state: State; stateReady: boolean;
  topic: string; days: string; search: string; limit: string; navigate: (view: View) => void; openPaper: (paper: Paper) => void;
}) {
  const papers = result?.papers || [];
  const breakdown = categoryBreakdown(papers);
  const signals = extractProblemSignals(papers);
  const lookup = new Map(papers.map((paper) => [paper.id, paper]));
  const visible = breakdown.slice(0, 6);
  const remaining = breakdown.slice(6).reduce((sum, item) => sum + item.count, 0);
  return <section className="dashboard" aria-label="Research overview">
    <div className="dashboard-scope"><CircleHelp size={16}/><span><strong>Static snapshot:</strong> {topic === "all" ? "All CS topics" : topicName(topic)} · first submitted in the last {days} days · up to {result?.limit ?? limit} displayed{search ? ` · local search: ${search}` : ""}{result ? ` · refreshed ${new Date(result.fetchedAt).toISOString().replace("T", " ").slice(0, 16)} UTC` : ""}. Latest 200 per indexed category; counts exclude papers absent from the snapshot and are not comprehensive.{topic === "autonomous" ? " Autonomous systems is a broad cs.RO, cs.MA, eess.SY proxy." : ""}</span></div>
    <div className="dashboard-stats">
      <div className="dashboard-stat"><span className="stat-icon"><FileText size={17}/></span><span className="stat-label">PAPERS FETCHED</span><strong>{result ? papers.length : "—"}</strong><small>Within current filters</small></div>
      <div className="dashboard-stat"><span className="stat-icon"><Layers2 size={17}/></span><span className="stat-label">CATEGORIES SEEN</span><strong>{result ? breakdown.length : "—"}</strong><small>First listed per paper</small></div>
      <div className="dashboard-stat"><span className="stat-icon"><Lightbulb size={17}/></span><span className="stat-label">POSSIBLE LEADS</span><strong>{result ? signals.length : "—"}</strong><small>Unverified abstract matches</small></div>
      <div className="dashboard-stat"><span className="stat-icon"><Bookmark size={17}/></span><span className="stat-label">SAVED PAPERS</span><strong>{stateReady ? state.saved.length : "—"}</strong><small>Entire local shortlist</small></div>
    </div>
    <div className="dashboard-grid">
      <section className="dashboard-panel breakdown-panel"><div className="dashboard-panel-head"><div><div className="section-kicker">CURRENT RESULT SET</div><h2>Recent papers by discipline</h2></div><button className="text-button" onClick={() => navigate("discover")}>Discover <ArrowRight size={15}/></button></div><p className="dashboard-hint">Each paper counted once under its first listed arXiv category, which may not reflect every discipline it belongs to.</p>
        {loading ? <div className="dashboard-empty"><LoaderCircle className="spin" size={18}/> Loading the published snapshot…</div> : error ? <div className="dashboard-empty" role="alert"><span>Couldn’t load papers: {error}</span><button className="outline-button" onClick={retry}>Try again</button></div> : !papers.length ? <div className="dashboard-empty">No papers in this result set. Try a broader topic or date range.</div> : <><div className="breakdown-list">{visible.map((item) => <div className="breakdown-row" key={item.category}><div className="breakdown-label"><span>{topicName(item.category)} <small>{topicName(item.category) !== item.category ? item.category : ""}</small></span><strong>{item.count}</strong></div><div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{ width: `${item.count / breakdown[0].count * 100}%` }}/></div></div>)}</div>{remaining > 0 && <p className="dashboard-hint">Other categories: {remaining} papers across {breakdown.length - visible.length} categories.</p>}</>}
      </section>
      <section className="dashboard-panel saved-panel"><div className="dashboard-panel-head"><div><div className="section-kicker">YOUR LIBRARY</div><h2>Saved papers</h2></div><button className="text-button" onClick={() => navigate("saved")}>View all <ArrowRight size={15}/></button></div><p className="dashboard-hint">Your latest saved papers, independent of the current filters.</p>
        {!stateReady ? <div className="dashboard-empty">Library is loading or unavailable. If it does not load, reload the page.</div> : !state.saved.length ? <div className="dashboard-empty">Nothing saved yet. Bookmark a paper in Discover to start your shortlist.</div> : <div className="dashboard-paper-list">{state.saved.slice(0, 3).map((paper) => <button key={paper.id} className="dashboard-paper" onClick={() => openPaper(paper)}><span><strong>{paper.title}</strong><small>Submitted {date(paper.published)}</small></span><ArrowUpRight size={16}/></button>)}</div>}
      </section>
      <section className="dashboard-panel leads-panel"><div className="dashboard-panel-head"><div><div className="section-kicker">ABSTRACT-BASED LEADS</div><h2>Possible research directions</h2></div><button className="text-button" onClick={() => navigate("problems")}>All signals <ArrowRight size={15}/></button></div><p className="dashboard-hint">Keyword-matched abstract sentences, not validated gaps. They may describe solved problems or be misclassified. No counter-search has been run for these leads; open a paper to investigate related work.</p>
        {loading ? <div className="dashboard-empty"><LoaderCircle className="spin" size={18}/> Loading possible leads…</div> : error ? <div className="dashboard-empty">Leads unavailable because the published snapshot could not be loaded.</div> : !signals.length ? <div className="dashboard-empty">No matching problem language in these abstracts. This does not mean there are no open problems.</div> : <div className="dashboard-leads">{signals.slice(0, 3).map((signal) => { const paper = lookup.get(signal.paperId); if (!paper) return null; return <article className="dashboard-lead" key={paper.id}><span className="tag">{signal.kind === "future" ? "POSSIBLE FUTURE WORK" : "CHALLENGE MENTION"} · UNVERIFIED</span><blockquote>“{signal.passage}”</blockquote><button className="dashboard-lead-title" onClick={() => openPaper(paper)}>{paper.title} <ArrowUpRight size={14}/></button><p>{paper.authors.join(", ") || "Authors"} · submitted {date(paper.published)} · revised {date(paper.updated)} · <a href={paper.versionUrl} target="_blank" rel="noreferrer">Source abstract <ExternalLink size={12}/></a></p></article>; })}</div>}
      </section>
    </div>
  </section>;
}

function PaperCard({ paper, index, saved, feedback, onSave, onFeedback, onOpen, stateReady }: { paper: Paper; index: number; saved: boolean; feedback?: string; onSave: () => void; onFeedback: (value: string) => void; onOpen: () => void; stateReady: boolean }) {
  return <article className="paper-card"><div className="paper-number">{String(index + 1).padStart(2, "0")}</div><div className="paper-body"><div className="paper-meta"><span className="tag">{paper.categories[0] || "arXiv"}</span><span>SUBMITTED {date(paper.published).toUpperCase()}</span>{paper.updated.slice(0, 10) !== paper.published.slice(0, 10) && <span>REVISED {date(paper.updated).toUpperCase()}</span>}</div><button className="paper-title" onClick={onOpen}>{paper.title}</button><p className="authors">{paper.authors.slice(0, 4).join(", ")}{paper.authors.length > 4 ? ` +${paper.authors.length - 4} more` : ""}</p><p className="paper-abstract">{paper.abstract}</p><div className="paper-bottom"><button className="text-button" onClick={onOpen}>View paper <ArrowRight size={15}/></button><div className="paper-controls"><span>Relevant?</span><button disabled={!stateReady} className={feedback === "relevant" ? "icon-button chosen" : "icon-button"} aria-label="Mark relevant" aria-pressed={feedback === "relevant"} onClick={() => onFeedback("relevant")}><ThumbsUp size={15}/></button><button disabled={!stateReady} className={feedback === "not-relevant" ? "icon-button chosen" : "icon-button"} aria-label="Mark not relevant" aria-pressed={feedback === "not-relevant"} onClick={() => onFeedback("not-relevant")}><ThumbsDown size={15}/></button></div></div></div><button className={saved ? "save-button saved" : "save-button"} disabled={!stateReady} aria-label={saved ? "Remove from shortlist" : "Save to shortlist"} onClick={onSave}>{saved ? <BookmarkCheck size={19}/> : <Bookmark size={19}/>}</button></article>;
}

function Digest({ papers, interests, openPaper }: { papers: Paper[]; interests: string[]; openPaper: (paper: Paper) => void }) {
  const matches = interests.length ? papers.filter((paper) => interests.some((interest) => topicMatches(paper, interest))) : papers;
  return <div className="digest"><div className="digest-intro"><div className="intro-icon"><BookOpen size={20}/></div><div><strong>{interests.length ? "Your interests in this result set" : "A quick reading list"}</strong><p>{interests.length ? `${matches.length} of ${papers.length} fetched papers match your saved interests. This is not a comprehensive digest.` : "Add interests to highlight matches. This list reflects only the current search results."}</p></div></div>{matches.length ? matches.slice(0, 10).map((paper, index) => <button className="digest-row" key={paper.id} onClick={() => openPaper(paper)}><span className="digest-index">{String(index + 1).padStart(2, "0")}</span><span><strong>{paper.title}</strong><small>{paper.categories.slice(0, 2).join(" · ")} &nbsp; / &nbsp; {date(paper.published)}</small></span><ArrowUpRight size={17}/></button>) : <div className="state-box"><strong>No interest matches in this result set.</strong><p>Try a broader filter or change your interests.</p></div>}</div>;
}

function ProblemSummary({ papers, topic, openPaper }: { papers: Paper[]; topic: string; openPaper: (paper: Paper) => void }) {
  const signals = extractProblemSignals(papers);
  const future = signals.filter((signal) => signal.kind === "future").length;
  const lookup = new Map(papers.map((paper) => [paper.id, paper]));
  return <div className="problem-summary">
    <div className="digest-intro"><div className="intro-icon"><Lightbulb size={20}/></div><div><strong>{topic === "all" ? "All computer science" : topicName(topic)}: {signals.length} possible leads in {papers.length} recent papers</strong><p>{future} possible future-work or open-question mentions; {signals.length - future} challenge or limitation mentions. Select a topic above for a field-specific view.</p></div></div>
    <div className="problem-caveat"><CircleHelp size={17}/><span>These are keyword-matched abstract sentences, not a synthesized literature review or verified research gaps. They can describe solved problems or be misclassified. No counter-search has been run for these leads. Open a paper and select <strong>Prepare investigation</strong> for a manual arXiv search link; also check full text and other sources.</span></div>
    {signals.length === 0 ? <div className="state-box"><Search size={25}/><strong>No matching problem language found</strong><p>Try a longer date range or another topic. The heuristic misses many problems; no matches do not mean there are none.</p></div> : <div className="problem-list">{signals.map((signal) => {
      const paper = lookup.get(signal.paperId);
      if (!paper) return null;
      return <article className="problem-card" key={paper.id}><div className="paper-meta"><span className="tag">{signal.kind === "future" ? "POSSIBLE OPEN QUESTION / FUTURE WORK" : "CHALLENGE / LIMITATION MENTION"}</span><span>UNVERIFIED · ABSTRACT ONLY</span></div><blockquote>“{signal.passage}”</blockquote><button className="paper-title" onClick={() => openPaper(paper)}>{paper.title}</button><p className="authors">{paper.authors.join(", ") || "Authors"} · first submitted {date(paper.published)} · revised {date(paper.updated)}</p><div className="problem-actions"><a href={paper.versionUrl} target="_blank" rel="noreferrer">Source abstract <ExternalLink size={13}/></a><button className="text-button" onClick={() => openPaper(paper)}>Open paper to investigate <ArrowRight size={15}/></button></div></article>;
    })}</div>}
  </div>;
}

function OpportunityCard({ analysis }: { analysis: Opportunity }) {
  return <div className="opportunity-card"><div className="opportunity-label"><FlaskConical size={14}/> {analysis.kind.toUpperCase()} <span>HEURISTIC</span></div><h4>{analysis.title}</h4><p>{analysis.direction}</p><div className="evidence-label">SUPPORTING PASSAGE · ABSTRACT ONLY</div><blockquote>“{analysis.passage}”</blockquote><a href={analysis.evidenceUrl} target="_blank" rel="noreferrer">{analysis.attribution} · revised {date(analysis.evidenceDate)} <ExternalLink size={13}/></a><div className="related"><div className="evidence-label">MANUAL RELATED-WORK SEARCH</div><p>No automated counter-search has been performed. Open the arXiv search and review results yourself; suggested terms: <strong>{analysis.terms.join(", ") || "paper title"}</strong>. Broaden the terms and check other sources.</p><a className="related-paper" href={analysis.searchUrl} target="_blank" rel="noreferrer">Search arXiv manually <ExternalLink size={14}/></a></div><div className="uncertainty"><CircleHelp size={15}/><span>Uncertainty: only one abstract was examined; full text, reviews, and related work have not been assessed. No novelty claim is made.</span></div></div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
