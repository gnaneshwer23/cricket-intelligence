import type { Team } from "@/lib/types";

function lightTeam(input: {
  id: string;
  name: string;
  short: string;
  accent: Team["accent"];
  summary: string;
  styles: string[];
}): Team {
  return {
    id: input.id as Team["id"],
    name: input.name,
    short: input.short,
    accent: input.accent,
    summary: input.summary,
    dna: [
      { label: "Identity", value: 78 },
      { label: "Ceiling", value: 74 },
      { label: "Depth", value: 70 },
      { label: "Pressure", value: 76 },
      { label: "Adaptability", value: 72 },
    ],
    styles: input.styles,
    analogue: {
      title: `${input.name} peak cycle`,
      similarity: 70,
      note: "Lighter team file — enough for follows, briefing seeds, and Teams browsing.",
    },
    evolution: [
      { year: "2022", title: "Recent cycle", note: "Method held through a noisy calendar.", tempo: 72 },
      { year: "2026", title: "This side", note: input.summary, tempo: 76 },
    ],
    health: [],
    futures: [
      {
        year: 2026,
        captain: "TBD",
        note: "Full future XI modelling lands when this side is a live Match Centre subject.",
        xi: ["Opener", "Batter", "Middle order", "All-rounder", "Keeper", "Bowler"],
      },
    ],
  };
}

export const extraTeams: Team[] = [
  lightTeam({
    id: "pakistan",
    name: "Pakistan",
    short: "PAK",
    accent: "lime",
    summary: "Swing with the new ball, Babar as the control batter, reverse when the shine fades.",
    styles: ["New-ball swing", "Late reverse", "Chase calm"],
  }),
  lightTeam({
    id: "south-africa",
    name: "South Africa",
    short: "SA",
    accent: "gold",
    summary: "Pace first. Rabada still the bowler who bends a session alone.",
    styles: ["Pace battery", "Hard lengths", "No quiet hours"],
  }),
  lightTeam({
    id: "sri-lanka",
    name: "Sri Lanka",
    short: "SL",
    accent: "ind",
    summary: "Spin craft and patient top orders. Lord's is not their theatre — Galle is.",
    styles: ["Spin first", "Bat time", "Wrist-spin luxury"],
  }),
  lightTeam({
    id: "west-indies",
    name: "West Indies",
    short: "WI",
    accent: "eng",
    summary: "Power hitters and bounce. White-ball identity louder than the Test cycle.",
    styles: ["Bounce", "Powerplay damage", "Athleticism"],
  }),
  lightTeam({
    id: "bangladesh",
    name: "Bangladesh",
    short: "BAN",
    accent: "lime",
    summary: "Shakib's generation still the reference. Home spin, rising middle-order calm.",
    styles: ["Left-arm spin", "Home fortress", "All-round depth"],
  }),
  lightTeam({
    id: "mi",
    name: "Mumbai Indians",
    short: "MI",
    accent: "eng",
    summary: "IPL franchise. Death overs, trophy habit, and blue-night finishing.",
    styles: ["Death bowling", "Finisher depth", "Auction craft"],
  }),
  lightTeam({
    id: "csk",
    name: "Chennai Super Kings",
    short: "CSK",
    accent: "gold",
    summary: "IPL franchise. Yellow army, finish with ice, Chepauk slow-burn.",
    styles: ["Finish calm", "Spin choke", "Leadership"],
  }),
  lightTeam({
    id: "rcb",
    name: "Royal Challengers Bengaluru",
    short: "RCB",
    accent: "ind",
    summary: "IPL franchise. Kohli nights and chase theatre in red and gold.",
    styles: ["Chase theatre", "Power hitting", "Star gravity"],
  }),
  lightTeam({
    id: "kkr",
    name: "Kolkata Knight Riders",
    short: "KKR",
    accent: "eng",
    summary: "IPL franchise. Narine mystery, Russell chaos, purple nights.",
    styles: ["Mystery spin", "Impact finishers", "Left-field XIs"],
  }),
  lightTeam({
    id: "dc",
    name: "Delhi Capitals",
    short: "DC",
    accent: "eng",
    summary: "IPL franchise. Pant invention and Capitals blue intensity.",
    styles: ["Youth core", "Pace bursts", "Keeper impact"],
  }),
  lightTeam({
    id: "srh",
    name: "Sunrisers Hyderabad",
    short: "SRH",
    accent: "ind",
    summary: "IPL franchise. Orange attack — Cummins plans and Klaasen clears.",
    styles: ["Powerplay aggression", "Captain pace", "Middle-order damage"],
  }),
  lightTeam({
    id: "rr",
    name: "Rajasthan Royals",
    short: "RR",
    accent: "eng",
    summary: "IPL franchise. Pink, Samson timing, Chahal in the middle overs.",
    styles: ["Unpredictable XIs", "Leg-spin choke", "Opener freedom"],
  }),
  lightTeam({
    id: "pbks",
    name: "Punjab Kings",
    short: "PBKS",
    accent: "ind",
    summary: "IPL franchise. Red kings — pace and punch at the top.",
    styles: ["High tempo", "Pace first", "Short boundaries"],
  }),
  lightTeam({
    id: "lsg",
    name: "Lucknow Super Giants",
    short: "LSG",
    accent: "lime",
    summary: "IPL franchise. Anchor then explode — Rahul and Pooran.",
    styles: ["Anchor opens", "Finisher depth", "Quiet middle overs"],
  }),
  lightTeam({
    id: "gt",
    name: "Gujarat Titans",
    short: "GT",
    accent: "gold",
    summary: "IPL franchise. Gill timing and Rashid's middle-over mystery.",
    styles: ["Top-order timing", "Mystery spin", "Auction discipline"],
  }),
  lightTeam({
    id: "india-women",
    name: "India Women",
    short: "IND-W",
    accent: "ind",
    summary: "Women's international side — Mandhana timing, chase craft, rising depth.",
    styles: ["Left-hand openers", "Chase calm", "Spin options"],
  }),
  lightTeam({
    id: "australia-women",
    name: "Australia Women",
    short: "AUS-W",
    accent: "gold",
    summary: "Women's international side — Perry all-round gravity, Healy tempo, system depth.",
    styles: ["All-round depth", "Fielding standard", "White-ball pace"],
  }),
];
