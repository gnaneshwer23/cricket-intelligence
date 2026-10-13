export type CatalogTeam = {
  id: string;
  name: string;
  short: string;
  group: "international" | "ipl";
  accent: string;
  blurb: string;
};

/** Nations + IPL franchises for first-run onboarding. */
export const catalogTeams: CatalogTeam[] = [
  { id: "england", name: "England", short: "ENG", group: "international", accent: "eng", blurb: "Bazball tempo with a control middle order." },
  { id: "india-women", name: "India Women", short: "IND-W", group: "international", accent: "ind", blurb: "Mandhana timing and chase craft." },
  { id: "australia-women", name: "Australia Women", short: "AUS-W", group: "international", accent: "gold", blurb: "Perry depth and Healy tempo." },
  { id: "india", name: "India", short: "IND", group: "international", accent: "ind", blurb: "Bumrah-shaped attacks and chase calm." },
  { id: "australia", name: "Australia", short: "AUS", group: "international", accent: "gold", blurb: "Pace battery and slip catching." },
  { id: "new-zealand", name: "New Zealand", short: "NZ", group: "international", accent: "lime", blurb: "Technique that removes your best hour." },
  { id: "pakistan", name: "Pakistan", short: "PAK", group: "international", accent: "lime", blurb: "Swing, Babar, and reverse when it bites." },
  { id: "south-africa", name: "South Africa", short: "SA", group: "international", accent: "gold", blurb: "Pace first. Rabada still the spear." },
  { id: "sri-lanka", name: "Sri Lanka", short: "SL", group: "international", accent: "ind", blurb: "Spin craft and late-career artisans." },
  { id: "west-indies", name: "West Indies", short: "WI", group: "international", accent: "eng", blurb: "Power hitters and bounce from the Caribbean." },
  { id: "bangladesh", name: "Bangladesh", short: "BAN", group: "international", accent: "lime", blurb: "Shakib's era and rising middle-order calm." },
  { id: "mi", name: "Mumbai Indians", short: "MI", group: "ipl", accent: "eng", blurb: "Blue machine. Death overs and trophy habit." },
  { id: "csk", name: "Chennai Super Kings", short: "CSK", group: "ipl", accent: "gold", blurb: "Yellow army. Finish with ice." },
  { id: "rcb", name: "Royal Challengers Bengaluru", short: "RCB", group: "ipl", accent: "ind", blurb: "Red and gold. Kohli nights." },
  { id: "kkr", name: "Kolkata Knight Riders", short: "KKR", group: "ipl", accent: "eng", blurb: "Purple chaos. Narine and Russell." },
  { id: "dc", name: "Delhi Capitals", short: "DC", group: "ipl", accent: "eng", blurb: "Capitals blue. Pant and Axar." },
  { id: "srh", name: "Sunrisers Hyderabad", short: "SRH", group: "ipl", accent: "ind", blurb: "Orange attack. Cummins and Klaasen." },
  { id: "rr", name: "Rajasthan Royals", short: "RR", group: "ipl", accent: "eng", blurb: "Pink. Samson and Chahal." },
  { id: "pbks", name: "Punjab Kings", short: "PBKS", group: "ipl", accent: "ind", blurb: "Red kings. Pace and punch." },
  { id: "lsg", name: "Lucknow Super Giants", short: "LSG", group: "ipl", accent: "lime", blurb: "Giants. Rahul anchors, Pooran finishes." },
  { id: "gt", name: "Gujarat Titans", short: "GT", group: "ipl", accent: "gold", blurb: "Titans. Gill timing, Rashid mystery." },
];

export const internationalTeamIds = catalogTeams
  .filter((team) => team.group === "international")
  .map((team) => team.id);

export const iplTeamIds = catalogTeams.filter((team) => team.group === "ipl").map((team) => team.id);

/** Featured household names shown first in the player picker. */
export const featuredPlayerIds = [
  "virat-kohli",
  "jasprit-bumrah",
  "babar-azam",
  "pat-cummins",
  "smriti-mandhana",
  "ellyse-perry",
  "david-warner",
  "shai-hope",
  "rohit-sharma",
  "steve-smith",
  "harry-brook",
  "joe-root",
  "ben-stokes",
  "kane-williamson",
  "mitchell-starc",
  "kagiso-rabada",
  "shaheen-afridi",
  "harmanpreet-kaur",
  "alyssa-healy",
  "ms-dhoni",
  "rishabh-pant",
  "travis-head",
  "shubman-gill",
  "rashid-khan",
];

export function catalogTeamLabel(id: string) {
  return catalogTeams.find((team) => team.id === id)?.name ?? id;
}

export function seedAskFromChoices(teamIds: string[], playerIds: string[]) {
  const primary =
    catalogTeams.find((team) => teamIds.includes(team.id) && team.group === "international") ??
    catalogTeams.find((team) => teamIds.includes(team.id));
  if (primary) {
    return `Tell me everything important about ${primary.name} this week.`;
  }
  if (playerIds[0]) {
    return `Tell me everything important about my followed players this week.`;
  }
  return "Summarise today's cricket in 30 seconds";
}
