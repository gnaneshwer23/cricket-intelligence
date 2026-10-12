import type { MoodKey } from "@/lib/types";

export type LiveBallEvent = {
  id: string;
  over: string;
  runs: number;
  wickets: number;
  outcome: string;
  commentary: string;
  aiLine?: string;
  batter: string;
  bowler: string;
  strikerRuns: number;
  strikerBalls: number;
  nonStrikerRuns: number;
  nonStrikerBalls: number;
  nonStriker: string;
  partnershipRuns: number;
  partnershipBalls: number;
  fowLabel?: string;
  swing: number;
  moodHint?: MoodKey;
};

/** Scripted demo stream — never a verified broadcast feed. */
export type LiveStatus = "loading" | "demo" | "paused" | "ended" | "error";

export type LiveMatchState = {
  status: LiveStatus;
  label: string;
  venue: string;
  title: string;
  session: string;
  runs: number;
  wickets: number;
  overs: string;
  ballsFaced: LiveBallEvent[];
  lastBalls: string[];
  striker: { name: string; runs: number; balls: number };
  nonStriker: { name: string; runs: number; balls: number };
  bowler: string;
  partnership: { runs: number; balls: number };
  fow: string[];
  engWin: number;
  indWin: number;
  vsModel: number;
  error: string | null;
  cursor: number;
  paused: boolean;
  followLatest: boolean;
};

const BASE_FOW = [
  "1-22 (Crawley, 4.3 ov)",
  "2-71 (Duckett, 14.1 ov)",
  "3-108 (Pope, 22.4 ov)",
  "4-241 (Brook, 47.5 ov)",
];

const LIVE_LABEL = "Simulated live · demo innings";

/** Scripted Lord's continuation from 245/4 after 48.2 overs. */
export const liveScript: LiveBallEvent[] = [
  {
    id: "b1",
    over: "48.3",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Jadeja angles into Stokes. Defended on the front foot.",
    aiLine: "Pad first, bat second — Stokes is still measuring the turn.",
    batter: "B. Stokes",
    bowler: "R. Jadeja",
    strikerRuns: 3,
    strikerBalls: 7,
    nonStriker: "J. Root",
    nonStrikerRuns: 89,
    nonStrikerBalls: 120,
    partnershipRuns: 4,
    partnershipBalls: 9,
    swing: -1,
  },
  {
    id: "b2",
    over: "48.4",
    runs: 4,
    wickets: 0,
    outcome: "4",
    commentary: "Stokes skips down and lofts over extra cover. Four. The field was in.",
    aiLine: "AI: that is a statement shot — Jadeja's control end just blinked.",
    batter: "B. Stokes",
    bowler: "R. Jadeja",
    strikerRuns: 7,
    strikerBalls: 8,
    nonStriker: "J. Root",
    nonStrikerRuns: 89,
    nonStrikerBalls: 120,
    partnershipRuns: 8,
    partnershipBalls: 10,
    swing: 2,
    moodHint: "fire",
  },
  {
    id: "b3",
    over: "48.5",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Worked into the gap at midwicket. Root has the strike.",
    aiLine: "Smart rotation — Bumrah is waiting at the other end.",
    batter: "B. Stokes",
    bowler: "R. Jadeja",
    strikerRuns: 8,
    strikerBalls: 9,
    nonStriker: "J. Root",
    nonStrikerRuns: 89,
    nonStrikerBalls: 120,
    partnershipRuns: 9,
    partnershipBalls: 11,
    swing: 0,
  },
  {
    id: "b4",
    over: "48.6",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Jadeja drifts onto the pads. Root clips one to fine leg.",
    aiLine: "Root leaves outside off all morning — this is the ball he scores from.",
    batter: "J. Root",
    bowler: "R. Jadeja",
    strikerRuns: 90,
    strikerBalls: 121,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 8,
    nonStrikerBalls: 9,
    partnershipRuns: 10,
    partnershipBalls: 12,
    swing: 1,
  },
  {
    id: "b5",
    over: "49.1",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Bumrah to Stokes, short of a length. Left alone.",
    aiLine: "Bumrah hits a hard length — Stokes' first fifteen balls are still open.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 8,
    strikerBalls: 10,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 10,
    partnershipBalls: 13,
    swing: 0,
  },
  {
    id: "b6",
    over: "49.2",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Stokes drives. The edge dies in front of slip.",
    aiLine: "Control number drops. Bumrah almost had the soft dismissal.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 8,
    strikerBalls: 11,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 10,
    partnershipBalls: 14,
    swing: -3,
    moodHint: "shock",
  },
  {
    id: "b7",
    over: "49.3",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Full and straight. Stokes digs out a yorker. No run.",
    aiLine: "Yorker as a probe, not a closer — the spell is working.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 8,
    strikerBalls: 12,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 10,
    partnershipBalls: 15,
    swing: -2,
  },
  {
    id: "b8",
    over: "49.4",
    runs: 2,
    wickets: 0,
    outcome: "2",
    commentary: "Width. Stokes steers through gully — two before deep point.",
    aiLine: "Not the slash Bumrah wanted. Stokes keeps the duel even.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 10,
    strikerBalls: 13,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 12,
    partnershipBalls: 16,
    swing: 1,
  },
  {
    id: "b9",
    over: "49.5",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Hip ball. Stokes tucks into short leg's hands on the bounce.",
    aiLine: "Bumrah is rewriting the line one ball at a time.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 10,
    strikerBalls: 14,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 12,
    partnershipBalls: 17,
    swing: -1,
  },
  {
    id: "b10",
    over: "49.6",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Stokes drops one at his feet and scampers. Root on strike for Kuldeep.",
    aiLine: "Partnership ticks to 13. The wrist spinner is back.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 11,
    strikerBalls: 15,
    nonStriker: "J. Root",
    nonStrikerRuns: 90,
    nonStrikerBalls: 121,
    partnershipRuns: 13,
    partnershipBalls: 18,
    swing: 0,
  },
  {
    id: "b11",
    over: "50.1",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Kuldeep to Root. Stock ball, defended. The leave can wait.",
    aiLine: "Root vs wrist spin: late hands, no premeditation yet.",
    batter: "J. Root",
    bowler: "K. Yadav",
    strikerRuns: 90,
    strikerBalls: 122,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 11,
    nonStrikerBalls: 15,
    partnershipRuns: 13,
    partnershipBalls: 19,
    swing: 0,
  },
  {
    id: "b12",
    over: "50.2",
    runs: 4,
    wickets: 0,
    outcome: "4",
    commentary: "Too full. Root drives through mid-off. Four. Ninety-four.",
    aiLine: "AI one-liner: Root still looks like lunch never happened.",
    batter: "J. Root",
    bowler: "K. Yadav",
    strikerRuns: 94,
    strikerBalls: 123,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 11,
    nonStrikerBalls: 15,
    partnershipRuns: 17,
    partnershipBalls: 20,
    swing: 2,
    moodHint: "clap",
  },
  {
    id: "b13",
    over: "50.3",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Root nurdles a single. Stokes faces the wrong'un window.",
    aiLine: "Milestone watch: Root needs 6 for 100, 66 for 14,000.",
    batter: "J. Root",
    bowler: "K. Yadav",
    strikerRuns: 95,
    strikerBalls: 124,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 11,
    nonStrikerBalls: 15,
    partnershipRuns: 18,
    partnershipBalls: 21,
    swing: 1,
  },
  {
    id: "b14",
    over: "50.4",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Kuldeep tosses it up. Stokes watches it turn past off stump.",
    aiLine: "Classic leave. The spell has to invent the mistake.",
    batter: "B. Stokes",
    bowler: "K. Yadav",
    strikerRuns: 11,
    strikerBalls: 16,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 18,
    partnershipBalls: 22,
    swing: 0,
  },
  {
    id: "b15",
    over: "50.5",
    runs: 6,
    wickets: 0,
    outcome: "6",
    commentary: "Stokes slog-sweeps over deep midwicket. Six!",
    aiLine: "AI: that is Headingley grammar — risk as a decision, not a panic.",
    batter: "B. Stokes",
    bowler: "K. Yadav",
    strikerRuns: 17,
    strikerBalls: 17,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 24,
    partnershipBalls: 23,
    swing: 4,
    moodHint: "fire",
  },
  {
    id: "b16",
    over: "50.6",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Stokes keeps the strike with a soft push to cover.",
    aiLine: "Partnership 25. India need a wicket more than a maiden.",
    batter: "B. Stokes",
    bowler: "K. Yadav",
    strikerRuns: 18,
    strikerBalls: 18,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 25,
    partnershipBalls: 24,
    swing: 1,
  },
  {
    id: "b17",
    over: "51.1",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Siraj, hard length. Stokes rides it down to gully.",
    aiLine: "Change of pace end — Siraj searching for the nick.",
    batter: "B. Stokes",
    bowler: "M. Siraj",
    strikerRuns: 18,
    strikerBalls: 19,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 25,
    partnershipBalls: 25,
    swing: 0,
  },
  {
    id: "b18",
    over: "51.2",
    runs: 4,
    wickets: 0,
    outcome: "4",
    commentary: "Short and wide. Stokes cuts hard behind point. Four more.",
    aiLine: "England accelerating without looking hurried.",
    batter: "B. Stokes",
    bowler: "M. Siraj",
    strikerRuns: 22,
    strikerBalls: 20,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 29,
    partnershipBalls: 26,
    swing: 2,
    moodHint: "clap",
  },
  {
    id: "b19",
    over: "51.3",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Better from Siraj — on a fourth-stump line. Left alone.",
    aiLine: "Root leaves outside off; Stokes is learning the same grammar.",
    batter: "B. Stokes",
    bowler: "M. Siraj",
    strikerRuns: 22,
    strikerBalls: 21,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 29,
    partnershipBalls: 27,
    swing: 0,
  },
  {
    id: "b20",
    over: "51.4",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Single to midwicket. Root on 95*, Stokes 23*.",
    aiLine: "Vs model: still comfortably ahead after the burst.",
    batter: "B. Stokes",
    bowler: "M. Siraj",
    strikerRuns: 23,
    strikerBalls: 22,
    nonStriker: "J. Root",
    nonStrikerRuns: 95,
    nonStrikerBalls: 124,
    partnershipRuns: 30,
    partnershipBalls: 28,
    swing: 0,
  },
  {
    id: "b21",
    over: "51.5",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Root leaves outside off. Classic Lord's patience.",
    aiLine: "Five runs from a hundred. The leave is still the shot.",
    batter: "J. Root",
    bowler: "M. Siraj",
    strikerRuns: 95,
    strikerBalls: 125,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 23,
    nonStrikerBalls: 22,
    partnershipRuns: 30,
    partnershipBalls: 29,
    swing: 0,
  },
  {
    id: "b22",
    over: "51.6",
    runs: 3,
    wickets: 0,
    outcome: "3",
    commentary: "Root clips off the hip — three before fine leg. Ninety-eight.",
    aiLine: "AI: landmark gravity now. The room is watching 100 and 14,000.",
    batter: "J. Root",
    bowler: "M. Siraj",
    strikerRuns: 98,
    strikerBalls: 126,
    nonStriker: "B. Stokes",
    nonStrikerRuns: 23,
    nonStrikerBalls: 22,
    partnershipRuns: 33,
    partnershipBalls: 30,
    swing: 2,
    moodHint: "mind",
  },
  {
    id: "b23",
    over: "52.1",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Bumrah returns. Stokes defends the hard length.",
    aiLine: "India's best bowler vs England's closer. Session hinge.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 23,
    strikerBalls: 23,
    nonStriker: "J. Root",
    nonStrikerRuns: 98,
    nonStrikerBalls: 126,
    partnershipRuns: 33,
    partnershipBalls: 31,
    swing: -1,
  },
  {
    id: "b24",
    over: "52.2",
    runs: 0,
    wickets: 1,
    outcome: "W",
    commentary: "Gone! Stokes edges a hard length to second slip. Jaiswal holds it.",
    aiLine: "AI: the fifteen-ball window finally closed. Bumrah flips the hour.",
    batter: "B. Stokes",
    bowler: "J. Bumrah",
    strikerRuns: 23,
    strikerBalls: 24,
    nonStriker: "J. Root",
    nonStrikerRuns: 98,
    nonStrikerBalls: 126,
    partnershipRuns: 0,
    partnershipBalls: 0,
    fowLabel: "5-278 (Stokes, 52.2 ov)",
    swing: -8,
    moodHint: "cry",
  },
  {
    id: "b25",
    over: "52.3",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Jamie Smith in. Bumrah spears a yorker — dug out.",
    aiLine: "New batter, old problem. Hard length then yorker.",
    batter: "J. Smith",
    bowler: "J. Bumrah",
    strikerRuns: 0,
    strikerBalls: 1,
    nonStriker: "J. Root",
    nonStrikerRuns: 98,
    nonStrikerBalls: 126,
    partnershipRuns: 0,
    partnershipBalls: 1,
    swing: -1,
  },
  {
    id: "b26",
    over: "52.4",
    runs: 0,
    wickets: 0,
    outcome: "·",
    commentary: "Smith leaves outside off. Sensible start.",
    aiLine: "Root on 98* needs the strike more than a hero shot.",
    batter: "J. Smith",
    bowler: "J. Bumrah",
    strikerRuns: 0,
    strikerBalls: 2,
    nonStriker: "J. Root",
    nonStrikerRuns: 98,
    nonStrikerBalls: 126,
    partnershipRuns: 0,
    partnershipBalls: 2,
    swing: 0,
  },
  {
    id: "b27",
    over: "52.5",
    runs: 1,
    wickets: 0,
    outcome: "1",
    commentary: "Smith tucks a single. Root will face the last ball of the over.",
    aiLine: "Hundred on the next ball if Root finds the gap.",
    batter: "J. Smith",
    bowler: "J. Bumrah",
    strikerRuns: 1,
    strikerBalls: 3,
    nonStriker: "J. Root",
    nonStrikerRuns: 98,
    nonStrikerBalls: 126,
    partnershipRuns: 1,
    partnershipBalls: 3,
    swing: 0,
  },
  {
    id: "b28",
    over: "52.6",
    runs: 2,
    wickets: 0,
    outcome: "2",
    commentary: "Root punches through cover — two. A Lord's hundred!",
    aiLine: "AI: 100* for Root. Still 62 from 14,000. The innings keeps growing.",
    batter: "J. Root",
    bowler: "J. Bumrah",
    strikerRuns: 100,
    strikerBalls: 127,
    nonStriker: "J. Smith",
    nonStrikerRuns: 1,
    nonStrikerBalls: 3,
    partnershipRuns: 3,
    partnershipBalls: 4,
    swing: 3,
    moodHint: "fire",
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildState(cursor: number, status: LiveStatus, paused: boolean, error: string | null): LiveMatchState {
  const played = liveScript.slice(0, Math.max(0, cursor));
  const last = played[played.length - 1];
  const runs = 245 + played.reduce((sum, ball) => sum + ball.runs, 0);
  const wickets = 4 + played.reduce((sum, ball) => sum + ball.wickets, 0);
  const swing = played.reduce((sum, ball) => sum + ball.swing, 0);
  const engWin = clamp(58 + swing, 8, 90);
  const fow = [...BASE_FOW, ...played.map((ball) => ball.fowLabel).filter(Boolean) as string[]];
  const lastBalls = played.slice(-6).map((ball) => ball.outcome);
  while (lastBalls.length < 6) lastBalls.unshift("·");

  return {
    status,
    label: LIVE_LABEL,
    venue: "Lord's",
    title: "England vs India",
    session: "Day 2 · 3rd Test · afternoon session",
    runs,
    wickets,
    overs: last?.over ?? "48.2",
    ballsFaced: played,
    lastBalls: lastBalls.slice(-6),
    striker: last
      ? { name: last.batter, runs: last.strikerRuns, balls: last.strikerBalls }
      : { name: "J. Root", runs: 89, balls: 120 },
    nonStriker: last
      ? { name: last.nonStriker, runs: last.nonStrikerRuns, balls: last.nonStrikerBalls }
      : { name: "B. Stokes", runs: 3, balls: 6 },
    bowler: last?.bowler ?? "K. Yadav",
    partnership: last
      ? { runs: last.partnershipRuns, balls: last.partnershipBalls }
      : { runs: 4, balls: 8 },
    fow,
    engWin,
    indWin: 100 - engWin,
    vsModel: 21 + Math.round(swing / 2),
    error,
    cursor,
    paused,
    followLatest: true,
  };
}

const TICK_MS = 2200;
const EVENT = "cricketos-live";

let store = buildState(0, "loading", false, null);
let timer: ReturnType<typeof setInterval> | null = null;
let started = false;
let failArmed = false;

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

function write(next: LiveMatchState) {
  store = next;
  emit();
}

function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function advance() {
  if (store.paused || store.status === "error" || store.status === "ended") return;

  // Occasional soft hiccup so empty/error UI can be exercised, then auto-recover.
  if (!failArmed && store.cursor === 12) {
    failArmed = true;
    clearTimer();
    write({
      ...store,
      status: "error",
      error: "Sim feed hiccup — reconnecting demo stream…",
      paused: true,
    });
    window.setTimeout(() => {
      write({ ...store, status: "demo", error: null, paused: false });
      startTimer();
    }, 1800);
    return;
  }

  if (store.cursor >= liveScript.length) {
    clearTimer();
    write({ ...store, status: "ended", paused: true });
    return;
  }

  const nextCursor = store.cursor + 1;
  const ended = nextCursor >= liveScript.length;
  write(
    buildState(
      nextCursor,
      ended ? "ended" : "demo",
      ended,
      null,
    ),
  );
}

function startTimer() {
  clearTimer();
  timer = setInterval(advance, TICK_MS);
}

export function getLiveSnapshot(): LiveMatchState {
  return store;
}

export function getLiveServerSnapshot(): LiveMatchState {
  return buildState(0, "loading", true, null);
}

export function subscribeLive(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  if (!started) {
    started = true;
    window.setTimeout(() => {
      write(buildState(0, "demo", false, null));
      startTimer();
    }, 600);
  }

  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function pauseLive() {
  clearTimer();
  write({ ...store, paused: true, status: store.status === "ended" ? "ended" : "paused" });
}

export function resumeLive() {
  if (store.status === "ended") {
    failArmed = false;
    write(buildState(0, "demo", false, null));
    startTimer();
    return;
  }
  write({ ...store, paused: false, status: "demo", error: null });
  startTimer();
}

export function jumpLiveToLatest() {
  write({
    ...buildState(liveScript.length, "ended", true, null),
    followLatest: true,
  });
  clearTimer();
}

export function setFollowLatest(value: boolean) {
  write({ ...store, followLatest: value });
}

export function retryLive() {
  failArmed = false;
  write(buildState(Math.max(0, store.cursor), "demo", false, null));
  startTimer();
}
