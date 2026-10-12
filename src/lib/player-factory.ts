import type { Dna, Player, Role, TraitLabel } from "@/lib/types";

const defaultDna = (role: Role): Dna => {
  if (role === "Bowler") {
    return { technical: 82, consistency: 78, spin: 55, pace: 88, mental: 80, leadership: 50, adaptability: 78 };
  }
  if (role === "All-rounder") {
    return { technical: 84, consistency: 80, spin: 72, pace: 82, mental: 86, leadership: 70, adaptability: 85 };
  }
  if (role === "Keeper") {
    return { technical: 86, consistency: 82, spin: 78, pace: 80, mental: 84, leadership: 72, adaptability: 86 };
  }
  return { technical: 86, consistency: 84, spin: 80, pace: 84, mental: 85, leadership: 65, adaptability: 84 };
};

const traitFor = (role: Role): TraitLabel => {
  if (role === "Bowler") return "Relentless";
  if (role === "All-rounder") return "Calculated";
  if (role === "Keeper") return "Calm";
  return "Technical";
};

/** Builds a lighter player profile for onboarding / similarity / historical search stubs. */
export function lightPlayer(input: {
  id: string;
  name: string;
  teamId: string;
  role: Role;
  style: string;
  age: number;
  span?: string;
  blurb: string;
  form?: number[];
  dna?: Partial<Dna>;
  formNote?: string;
  twinYears?: number;
  /** Historical / retired stub for search — keeps DEMO honesty on depth. */
  historical?: boolean;
}): Player {
  const role = input.role;
  const dna = { ...defaultDna(role), ...input.dna };
  const trait = traitFor(role);
  const historical = Boolean(input.historical);
  const formNote =
    input.formNote ??
    (historical
      ? "Historical stub — era, side, and role for search and follows. Rich DNA stays on core demo subjects."
      : "Lighter profile — enough for follows, similarity, and Ask seeding.");
  return {
    id: input.id,
    name: input.name,
    teamId: input.teamId,
    role,
    style: input.style,
    age: input.age,
    span: input.span ?? "2018 –",
    form: input.form ?? [12, 44, 8, 67, 3, 91, 18, 35],
    formLabel: role === "Bowler" ? "Wickets in last eight inns" : "Last eight scores",
    formNote,
    dna,
    traits: [
      { label: trait, level: 86, note: input.blurb },
      { label: "Patient", level: 78, note: "Builds without forcing the session." },
      { label: "Calculated", level: 80, note: "Risk arrives when the field invents a pocket." },
      { label: "Calm", level: 76, note: "Dressing rooms settle when the method holds." },
    ],
    similar: [],
    projection: {
      headline: historical
        ? "Historical reference"
        : role === "Bowler"
          ? "Attack option"
          : "International regular",
      elite: historical ? 90 : 72,
      captain: role === "Batter" ? 40 : 20,
      worldXI: historical ? 88 : 48,
      landmark: role === "Bowler" ? "200 Test wickets" : "5,000 international runs",
      landmarkChance: historical ? 95 : 55,
      retire: historical ? "Retired" : String(input.age + 8),
      peakAge: historical ? Math.min(input.age, 34) : Math.min(input.age + 2, 34),
    },
    report: {
      strengths: [input.blurb, "Reliable enough to seed a briefing", "Known quantity in big matches"],
      weaknesses: ["Profile is lighter than full DNA subjects", "Match-specific form still sparse in this file"],
      development: historical
        ? "Searchable historical stub. DEMO honesty: not a full Career DNA model."
        : "Held for onboarding, follows, and Ask entity matching. Open a full DNA subject for deeper modelling.",
    },
    milestones: [
      { label: role === "Bowler" ? "Test wickets" : "Test runs", current: historical ? 4000 : 1000, target: 5000 },
    ],
    twinYears: input.twinYears ?? (historical ? 20 : 8),
    twinLines: [
      historical
        ? `${input.name} is in the catalog as a historical search stub — era context for Ask, not a live Twin.`
        : `${input.name.split(" ").slice(-1)[0]} is in the catalog as a follow target and Ask entity — not a full twin yet.`,
    ],
    blurb: input.blurb,
    away: historical
      ? "Away legend status is summarised in the blurb — not fully modelled."
      : "Away form is held lightly until a deeper file is built.",
    chases: role === "Batter" || role === "All-rounder" || role === "Keeper"
      ? historical
        ? "Chase lore is summarised for search context."
        : "Chase patterns are summarised, not fully modelled."
      : "Defends totals by holding a length.",
    opponents: "Key rivalries land when you Ask about a named matchup.",
  };
}
