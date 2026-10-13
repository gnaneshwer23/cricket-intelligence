export type ScreenId =
  | "home"
  | "ask"
  | "match"
  | "explorer"
  | "players"
  | "feed"
  | "teams"
  | "community"
  | "fantasy"
  | "labs";

/** Seed for What-If Lab from Match Graph / Explorer (hypothetical, labelled). */
export type LabsSeed = {
  source: "match-graph" | "explorer" | "manual";
  label: string;
  runsRequired: number;
  ballsRemaining: number;
  wicketsInHand: number;
  currentRuns?: number;
  ballsFaced?: number;
  assumedRpo?: number;
  observedNote?: string;
};

export type ExplorerFocus = {
  chart?: "worm" | "manhattan" | "phases";
  overNumber?: number;
  ballIndex?: number;
  from?: string;
};

export type AskMode =
  | "general"
  | "predictions"
  | "fantasy"
  | "historical"
  | "career"
  | "twin";

export type Role = "Batter" | "Bowler" | "All-rounder" | "Keeper";

export type MoodKey = "fire" | "clap" | "shock" | "cry" | "rage" | "mind";

export type Risk = "Low" | "Watch" | "High";

export type TraitLabel =
  | "Aggressive"
  | "Technical"
  | "Calm"
  | "Explosive"
  | "Patient"
  | "Creative"
  | "Relentless"
  | "Calculated";

export type Dna = {
  technical: number;
  consistency: number;
  spin: number;
  pace: number;
  mental: number;
  leadership: number;
  adaptability: number;
};

export type Player = {
  id: string;
  name: string;
  teamId: string;
  role: Role;
  style: string;
  age: number;
  span: string;
  form: number[];
  formLabel: string;
  formNote: string;
  dna: Dna;
  traits: { label: TraitLabel; level: number; note: string }[];
  similar: { id: string; score: number; note: string }[];
  projection: {
    headline: string;
    elite: number;
    captain: number;
    worldXI: number;
    landmark: string;
    landmarkChance: number;
    retire: string;
    peakAge: number;
  };
  report: {
    strengths: string[];
    weaknesses: string[];
    development: string;
  };
  milestones: { label: string; current: number; target: number }[];
  twinYears: number;
  twinLines: string[];
  blurb: string;
  away: string;
  chases: string;
  opponents: string;
};

export type TeamId = string;

export type SquadRow = {
  name: string;
  playerId?: string;
  role: string;
  fitness: number;
  workload: number;
  risk: Risk;
  note: string;
};

export type FutureSquad = {
  year: number;
  captain: string;
  note: string;
  xi: string[];
};

export type Team = {
  id: TeamId;
  name: string;
  short: string;
  accent: "eng" | "ind" | "gold" | "lime";
  summary: string;
  dna: { label: string; value: number }[];
  styles: string[];
  analogue: { title: string; similarity: number; note: string };
  evolution: { year: string; title: string; note: string; tempo: number }[];
  health: SquadRow[];
  futures: FutureSquad[];
};

export type AnswerEvidence = {
  id: string;
  label: string;
  detail: string;
  /** fact | historical | model | hypothetical | demo */
  kind: "fact" | "historical" | "model" | "hypothetical" | "demo";
};

/** Normalised match rows for Copilot historical mode (from `/api/matches`). */
export type HistoricalMatchSummary = {
  id: string;
  title: string;
  freshness: string;
  venue: string;
  format: string;
  score?: { runs: number; wickets: number; overs: string };
  teams?: { home: string; away: string };
  provenance?: { source: string; note?: string };
};

export type Answer = {
  headline: string;
  paragraphs: string[];
  figures?: { label: string; value: string }[];
  confidence?: number;
  followups: string[];
  speaker?: string;
  /** How the answer was produced — never claim connected LLM unless configured. */
  method?: "rule-engine" | "deterministic-calc" | "llm-explain";
  evidence?: AnswerEvidence[];
  /** Short provenance line shown under the answer. */
  provenanceNote?: string;
};

export type AnswerOptions = {
  historicalMatches?: HistoricalMatchSummary[];
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: Answer }
  | { id: string; role: "error"; text: string };

export type SavedChat = {
  id: string;
  question: string;
  headline: string;
  at: number;
};

export type Preferences = {
  englandOnly: boolean;
  alerts: boolean;
};
