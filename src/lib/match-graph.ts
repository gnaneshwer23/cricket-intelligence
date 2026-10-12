import type { DataKind } from "@/lib/contracts";

/** Match Graph node — event → player → consequence → scenario (no graph DB). */

export type GraphNodeKind = "event" | "player" | "consequence" | "scenario";

export type MatchGraphNode = {
  id: string;
  kind: GraphNodeKind;
  title: string;
  detail: string;
  dataKind: DataKind;
  overs?: string;
  playerIds?: string[];
  evidenceIds?: string[];
};

export type MatchGraphEdge = {
  from: string;
  to: string;
  label: string;
};

export const matchGraphNodes: MatchGraphNode[] = [
  {
    id: "evt-bumrah-newball",
    kind: "event",
    title: "Bumrah new-ball burst",
    detail: "Crawley and Duckett removed. Innings level with phase expectation at 108/3.",
    dataKind: "demo",
    overs: "1–14",
    playerIds: ["jasprit-bumrah"],
    evidenceIds: ["ev-newball"],
  },
  {
    id: "evt-phase-22-30",
    kind: "event",
    title: "Overs 22–30 surge",
    detail: "72 scored vs 48 expected. Control end stopped controlling.",
    dataKind: "demo",
    overs: "22–30",
    playerIds: ["joe-root", "harry-brook"],
    evidenceIds: ["ev-phase-2230"],
  },
  {
    id: "evt-over-27",
    kind: "event",
    title: "Over 27 — 14 off Jadeja",
    detail: "Turning point already played. Momentum flipped for the morning.",
    dataKind: "demo",
    overs: "27",
    playerIds: ["joe-root", "harry-brook", "ravindra-jadeja"],
    evidenceIds: ["ev-over-27"],
  },
  {
    id: "evt-brook-out",
    kind: "event",
    title: "Brook c Pant b Kuldeep 64",
    detail: "Known spin hole; stand broken at 241.",
    dataKind: "demo",
    overs: "47.5",
    playerIds: ["harry-brook", "kuldeep-yadav"],
    evidenceIds: ["ev-brook-kuldeep"],
  },
  {
    id: "pl-root",
    kind: "player",
    title: "Joe Root 89*",
    detail: "Leave-and-clip neutralised spin. Milestone: 73 from 14,000.",
    dataKind: "demo",
    playerIds: ["joe-root"],
    evidenceIds: ["ev-root-innings"],
  },
  {
    id: "pl-stokes-kuldeep",
    kind: "player",
    title: "Stokes vs Kuldeep window",
    detail: "Dismissal risk highest in first 15 balls of wrist spin; 6 done.",
    dataKind: "demo",
    playerIds: ["ben-stokes", "kuldeep-yadav"],
    evidenceIds: ["ev-stokes-kuldeep"],
  },
  {
    id: "con-plus-21",
    kind: "consequence",
    title: "+21 vs phase model",
    detail: "Most of the lead was earned in overs 22–30.",
    dataKind: "model",
    evidenceIds: ["ev-phase-2230"],
  },
  {
    id: "con-win-58",
    kind: "consequence",
    title: "Win model Eng 58 / Ind 42",
    detail: "Illustrative session model — not a betting price.",
    dataKind: "model",
    evidenceIds: ["ev-win-model"],
  },
  {
    id: "sc-bumrah-burst",
    kind: "scenario",
    title: "What if Bumrah takes a wicket in the next burst?",
    detail: "Hypothetical: swings the hour toward 50-50.",
    dataKind: "hypothetical",
    playerIds: ["jasprit-bumrah"],
    evidenceIds: ["ev-win-model"],
  },
  {
    id: "sc-bumrah-out",
    kind: "scenario",
    title: "What if Bumrah unavailable?",
    detail: "Hypothetical: India win chance falls to 18% in the demo model.",
    dataKind: "hypothetical",
    playerIds: ["jasprit-bumrah"],
    evidenceIds: ["ev-win-model"],
  },
];

export const matchGraphEdges: MatchGraphEdge[] = [
  { from: "evt-bumrah-newball", to: "evt-phase-22-30", label: "then" },
  { from: "evt-phase-22-30", to: "evt-over-27", label: "includes" },
  { from: "evt-over-27", to: "pl-root", label: "anchored by" },
  { from: "evt-phase-22-30", to: "con-plus-21", label: "produces" },
  { from: "con-plus-21", to: "con-win-58", label: "feeds" },
  { from: "evt-brook-out", to: "pl-stokes-kuldeep", label: "opens" },
  { from: "pl-stokes-kuldeep", to: "sc-bumrah-burst", label: "next risk" },
  { from: "con-win-58", to: "sc-bumrah-out", label: "stress-test" },
];

export const matchEvidence = [
  {
    id: "ev-newball",
    label: "New-ball wickets",
    detail: "Crawley 18, Duckett 41 — both to Bumrah (demo scorecard).",
    kind: "demo" as const,
    relatedPlayerIds: ["jasprit-bumrah"],
  },
  {
    id: "ev-phase-2230",
    label: "Phase 22–30",
    detail: "72 scored · 48 expected · delta +24 (deterministic from phase table).",
    kind: "demo" as const,
    relatedPlayerIds: ["joe-root", "harry-brook"],
  },
  {
    id: "ev-over-27",
    label: "Over 27",
    detail: "14 off Jadeja — session report turning point.",
    kind: "demo" as const,
  },
  {
    id: "ev-brook-kuldeep",
    label: "Brook dismissal",
    detail: "c Pant b Kuldeep 64 (68) — demo scorecard.",
    kind: "demo" as const,
    relatedPlayerIds: ["harry-brook", "kuldeep-yadav"],
  },
  {
    id: "ev-root-innings",
    label: "Root innings",
    detail: "89* off 120 · SR from balls faced · 73 to 14,000 milestone.",
    kind: "demo" as const,
    relatedPlayerIds: ["joe-root"],
  },
  {
    id: "ev-stokes-kuldeep",
    label: "Stokes–Kuldeep",
    detail: "6 balls into a 15-ball elevated-risk window (demo matchup file).",
    kind: "demo" as const,
    relatedPlayerIds: ["ben-stokes", "kuldeep-yadav"],
  },
  {
    id: "ev-win-model",
    label: "Session win model",
    detail: "Base 58/42 from demo prior; sim swings apply clamp(5–92).",
    kind: "model" as const,
  },
];

export function getGraphNode(id: string) {
  return matchGraphNodes.find((node) => node.id === id);
}

export function outgoing(id: string) {
  return matchGraphEdges.filter((edge) => edge.from === id);
}
