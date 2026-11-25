import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bookmark,
  ChevronDown,
  CircleHelp,
  Compass,
  Filter,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { topicName, topics } from "../research.js";
import type { View } from "../types.js";

type WorkspaceLayoutProps = {
  children: ReactNode;
  view: View;
  title: string;
  description: string;
  savedCount: number;
  interests: string[];
  topic: string;
  days: string;
  limit: string;
  search: string;
  theme: string;
  layout: string;
  density: string;
  actionError: string;
  snapshotStatus: string;
  onNavigate: (view: View) => void;
  onManageInterests: () => void;
  onSelectInterest: (code: string) => void;
  onTopicChange: (value: string) => void;
  onDaysChange: (value: string) => void;
  onLimitChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onThemeChange: (value: string) => void;
  onLayoutChange: (value: string) => void;
  onDensityChange: (value: string) => void;
  onDismissError: () => void;
};

export function WorkspaceLayout({
  children,
  view,
  title,
  description,
  savedCount,
  interests,
  topic,
  days,
  limit,
  search,
  theme,
  layout,
  density,
  actionError,
  snapshotStatus,
  onNavigate,
  onManageInterests,
  onSelectInterest,
  onTopicChange,
  onDaysChange,
  onLimitChange,
  onSearchChange,
  onSearchSubmit,
  onThemeChange,
  onLayoutChange,
  onDensityChange,
  onDismissError,
}: WorkspaceLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const showFilters = view !== "saved" && view !== "about";

  function navigate(nextView: View) {
    onNavigate(nextView);
    setMobileMenuOpen(false);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <div className="app-shell" data-layout={layout} data-density={density}>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div>
            <strong>research radar</strong>
            <span>YOUR RESEARCH COMPASS</span>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <span className="nav-heading">WORKSPACE</span>
          <button className={view === "overview" ? "nav-item active" : "nav-item"} onClick={() => navigate("overview")}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={view === "discover" ? "nav-item active" : "nav-item"} onClick={() => navigate("discover")}>
            <Compass size={18} /> Discover <ArrowRight className="nav-arrow" size={15} />
          </button>
          <button className={view === "problems" ? "nav-item active" : "nav-item"} onClick={() => navigate("problems")}>
            <Lightbulb size={18} /> Problem signals
          </button>
          <button className={view === "saved" ? "nav-item active" : "nav-item"} onClick={() => navigate("saved")}>
            <Bookmark size={18} /> Shortlist <span className="nav-count">{savedCount}</span>
          </button>
          <button className={view === "about" ? "nav-item active" : "nav-item"} onClick={() => navigate("about")}>
            <CircleHelp size={18} /> About
          </button>
          <div className="nav-divider" />
          <div className="nav-heading interests-heading">
            YOUR INTERESTS
            <button aria-label="Manage interests" onClick={onManageInterests}><Settings2 size={15} /></button>
          </div>
          {interests.length ? (
            interests.map((code) => (
              <button
                key={code}
                className="interest-link"
                onClick={() => {
                  onSelectInterest(code);
                  setMobileMenuOpen(false);
                }}
              >
                <span className="interest-dot" />{topicName(code)}
              </button>
            ))
          ) : (
            <button className="add-interests" onClick={onManageInterests}>+ Add research interests</button>
          )}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>{title.replace(/[.!?]$/, "")}</strong>
          </div>
          <div className="top-right">
            <span className="live-dot" />
            <span>{snapshotStatus}</span>
            <span className="top-divider" />
            <div className="view-options-wrap">
              <button
                className="view-options-button"
                aria-expanded={viewOptionsOpen}
                aria-controls="view-options-panel"
                onClick={() => setViewOptionsOpen(!viewOptionsOpen)}
              >
                <SlidersHorizontal size={17} /> View options
              </button>
              {viewOptionsOpen && (
                <div className="view-options-panel" id="view-options-panel">
                  <label>
                    <span>Color scheme</span>
                    <select aria-label="Color scheme" value={theme} onChange={(event) => onThemeChange(event.target.value)}>
                      <option value="field">Field Notes · light</option>
                      <option value="library">Library · light</option>
                      <option value="moss">Forest After Dark</option>
                      <option value="ocean">Blue Hour</option>
                      <option value="ember">Warm Graphite</option>
                    </select>
                  </label>
                  <label>
                    <span>Layout</span>
                    <select aria-label="Layout" value={layout} onChange={(event) => onLayoutChange(event.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="wide">Wide workspace</option>
                      <option value="reading">Reading column</option>
                    </select>
                  </label>
                  <label>
                    <span>Text density</span>
                    <select aria-label="Text density" value={density} onChange={(event) => onDensityChange(event.target.value)}>
                      <option value="full">Full text</option>
                      <option value="balanced">Balanced</option>
                      <option value="concise">Concise</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-dot" /> YOUR RESEARCH RADAR</div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {view !== "about" && (
              <button className="outline-button heading-button" onClick={onManageInterests}>
                <Settings2 size={16} /> Manage interests
              </button>
            )}
          </div>

          {actionError && (
            <div className="notice error" role="alert">
              {actionError}
              <button onClick={onDismissError} aria-label="Dismiss error"><X size={16} /></button>
            </div>
          )}

          {view === "discover" && (
            <div className="intro-banner">
              <div className="intro-icon"><Sparkles size={20} /></div>
              <div>
                <strong>Find signals, not just papers.</strong>
                <p>Explore recent work, save what matters, and investigate potential research directions with evidence.</p>
              </div>
              <span className="banner-label">BUILT FOR CURIOSITY <ArrowRight size={14} /></span>
            </div>
          )}

          {showFilters && (
            <div className="filters">
              <form className="search-box" onSubmit={submitSearch}>
                <Search size={18} />
                <input
                  aria-label="Search papers"
                  placeholder="Search papers, topics, or keywords..."
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>
              <div className="select-wrap">
                <Filter size={16} />
                <select aria-label="Topic" value={topic} onChange={(event) => onTopicChange(event.target.value)}>
                  <option value="all">All CS topics</option>
                  {topics.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
                </select>
                <ChevronDown size={14} />
              </div>
              <div className="select-wrap date-select">
                <select aria-label="Date range" value={days} onChange={(event) => onDaysChange(event.target.value)}>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="365">Last year</option>
                </select>
                <ChevronDown size={14} />
              </div>
              <div className="select-wrap">
                <select aria-label="Maximum results" value={limit} onChange={(event) => onLimitChange(event.target.value)}>
                  <option value="40">Up to 40 papers</option>
                  <option value="100">Up to 100 papers</option>
                  <option value="200">Up to 200 papers</option>
                </select>
                <ChevronDown size={14} />
              </div>
            </div>
          )}

          {children}

          <footer>
            <span><Activity size={15} /> Research Radar <span className="footer-divider">/</span> A more thoughtful way to explore.</span>
            <span>Made for curious minds <span className="footer-star">✳</span></span>
          </footer>
        </div>
      </main>
    </div>
  );
}