import type { prepareInvestigation } from "./utils/investigation.js";

export type Paper = {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  url: string;
  versionUrl: string;
  savedAt?: string;
};

export type Feedback = Record<string, string>;

export type State = {
  saved: Paper[];
  interests: string[];
  feedback: Feedback;
};

export type Snapshot = {
  version: number;
  generatedAt: string;
  perCategoryLimit: number;
  categories: string[];
  papers: Paper[];
};

export type Result = {
  papers: Paper[];
  query: string;
  fetchedAt: string;
  limit: number;
};

export type Opportunity = ReturnType<typeof prepareInvestigation>;
export type View = "overview" | "discover" | "saved" | "problems" | "about";
export type Theme = "field" | "library" | "moss" | "ocean" | "ember";
export type Layout = "standard" | "wide" | "reading";
export type Density = "full" | "balanced" | "concise";
export type ViewMode = "simple" | "detailed";