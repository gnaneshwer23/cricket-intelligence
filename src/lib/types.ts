export type ScreenId =
  | "home"
  | "ask"
  | "match"
  | "players"
  | "teams"
  | "community"
  | "fantasy"
  | "labs";

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

export type TeamId = "england" | "india" | "australia" | "new-zealand";

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

export type Answer = {
  headline: string;
  paragraphs: string[];
  figures?: { label: string; value: string }[];
  confidence?: number;
  followups: string[];
  speaker?: string;
};

export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; answer: Answer }
  | { id: string; role: "error"; text: string };
