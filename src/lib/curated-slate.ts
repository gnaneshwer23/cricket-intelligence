/**
 * Multi-team curated defaults — CricketOS is not a single-player watch product.
 * Used for first-run follows, briefing fallbacks, and Copilot empty prompts.
 */

/** Diverse starter follows when the user has not personalised yet. */
export const DEFAULT_FOLLOWED_TEAMS = [
  "india",
  "australia",
  "west-indies",
  "mi",
] as const;

export const DEFAULT_FOLLOWED_PLAYERS = [
  "virat-kohli",
  "babar-azam",
  "pat-cummins",
  "smriti-mandhana",
  "shai-hope",
  "david-warner",
] as const;

/** Onboarding pre-selects — multi-nation, not England-only. */
export const ONBOARDING_DEFAULT_TEAMS = ["india", "australia", "west-indies"] as const;
export const ONBOARDING_DEFAULT_PLAYERS = [
  "virat-kohli",
  "pat-cummins",
  "smriti-mandhana",
] as const;

/** Copilot empty-state prompts spanning formats, regions, and eras. */
export const DIVERSE_ASK_PROMPTS = {
  general: [
    "Why is Bumrah difficult to face?",
    "Summarise today's cricket in 30 seconds",
    "How does Kohli build a chase?",
    "What makes Warner dangerous in white-ball cricket?",
    "Tell me everything important about women's cricket this week",
  ],
  predictions: [
    "Who wins the next IPL title race narrative?",
    "Project Australia's next Test session",
    "Who likely scores next for India?",
    "What are the turning points in a T20 chase?",
  ],
  fantasy: [
    "Who should captain in an IPL week?",
    "Is Bumrah still a must-start?",
    "Differential pick: WI all-rounder or Aussie opener?",
    "Does a calf alert change the XI?",
  ],
  historical: [
    "Show Stokes' best chases",
    "Sachin at 24 vs Kohli",
    "Compare Lara and Tendulkar peak years",
    "Best Test innings since 2000",
    "India women vs Australia women — classic finals",
  ],
  career: [
    "Closest trajectory to Babar",
    "Predict Brook's career",
    "Most similar to Kohli",
    "Where does Mandhana sit among openers?",
  ],
  twin: [
    "Explain how Virat Kohli approaches run chases.",
    "How does Babar build an innings after a quiet start?",
    "What does Warner do in the first six overs of a T20?",
    "How does Bumrah choose the yorker?",
  ],
} as const;

export const DIVERSE_RECOMMENDATIONS = [
  { q: "Why is Bumrah difficult to face today?", mode: "general" as const },
  { q: "How does Kohli build a chase?", mode: "general" as const },
  { q: "Closest trajectory to Babar", mode: "career" as const },
  { q: "Sachin at 24 vs Kohli", mode: "historical" as const },
  { q: "What makes Warner dangerous in white-ball cricket?", mode: "general" as const },
  { q: "Tell me everything important about women's cricket this week", mode: "general" as const },
  { q: "Summarise today's cricket in 30 seconds", mode: "general" as const },
];

export const DIVERSE_TRENDING = [
  { label: "Bumrah peak", q: "Why is Bumrah dominating today?" },
  { label: "Kohli chase DNA", q: "How does Kohli build a chase?" },
  { label: "Babar twin", q: "Closest trajectory to Babar" },
  { label: "IPL night", q: "Who should captain in an IPL week?" },
  { label: "Women's week", q: "Tell me everything important about women's cricket this week" },
  { label: "WI power", q: "Tell me everything important about West Indies this week" },
];

export function defaultSeedAsk(): string {
  return "Summarise today's cricket across the formats I care about.";
}
