/** Shared data contracts — live facts vs historical vs model vs hypothetical. */

export type MatchLifecycle = "LIVE" | "COMPLETED" | "UPCOMING" | "DEMO";

export type DataKind =
  | "fact"
  | "historical"
  | "model"
  | "hypothetical"
  | "demo";

export type Provenance = {
  kind: DataKind;
  source: string;
  asOf: string;
  note?: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  detail: string;
  kind: DataKind;
  relatedPlayerIds?: string[];
  relatedEventIds?: string[];
};

export type MatchMeta = {
  id: string;
  status: MatchLifecycle;
  title: string;
  venue: string;
  dayLabel: string;
  series: string;
  score: { runs: number; wickets: number; overs: string };
  winModel: { eng: number; ind: number; draw?: number };
  provenance: Provenance;
};

export function statusLabel(status: MatchLifecycle): string {
  switch (status) {
    case "LIVE":
      return "LIVE";
    case "COMPLETED":
      return "COMPLETED";
    case "UPCOMING":
      return "UPCOMING";
    case "DEMO":
      return "DEMO";
  }
}

export function kindLabel(kind: DataKind): string {
  switch (kind) {
    case "fact":
      return "Fact";
    case "historical":
      return "Historical";
    case "model":
      return "Model";
    case "hypothetical":
      return "Hypothetical";
    case "demo":
      return "Demo dataset";
  }
}
