/**
 * Compact team abbreviations for Live Scores cards (Cricbuzz-style scanning).
 * Prefer known codes over naive slice(0,3).
 */

const EXACT: Record<string, string> = {
  england: "ENG",
  india: "IND",
  australia: "AUS",
  "south africa": "SA",
  "new zealand": "NZ",
  pakistan: "PAK",
  "sri lanka": "SL",
  "west indies": "WI",
  bangladesh: "BAN",
  afghanistan: "AFG",
  ireland: "IRE",
  zimbabwe: "ZIM",
  netherlands: "NED",
  scotland: "SCO",
  namibia: "NAM",
  "england women": "ENG-W",
  "india women": "IND-W",
  "australia women": "AUS-W",
  "south africa women": "SA-W",
  "new zealand women": "NZ-W",
  "pakistan women": "PAK-W",
  "west indies women": "WI-W",
  "mumbai indians": "MI",
  "chennai super kings": "CSK",
  "kolkata knight riders": "KKR",
  "sunrisers hyderabad": "SRH",
  "royal challengers bangalore": "RCB",
  "royal challengers bengaluru": "RCB",
  "rajasthan royals": "RR",
  "delhi capitals": "DC",
  "punjab kings": "PBKS",
  "gujarat titans": "GT",
  "lucknow super giants": "LSG",
};

/** Return a short display code for a full team name. */
export function teamAbbr(name: string | undefined | null): string {
  if (!name) return "—";
  const key = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (EXACT[key]) return EXACT[key];
  // Women / U19 suffix variants
  for (const [full, code] of Object.entries(EXACT)) {
    if (key.startsWith(full)) return code;
  }
  // Knockout placeholders such as "A1 (ind)" → "A1"; drop bracketed notes.
  const base = name.replace(/\s*\([^)]*\)\s*/g, " ").trim() || name.trim();
  if (EXACT[base.toLowerCase()]) return EXACT[base.toLowerCase()]!;
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  if (words.length === 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase() || base.slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}
