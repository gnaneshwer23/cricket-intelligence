import {
  analyseChase,
  analysePhases,
  cumulativePhaseLead,
  formatMetric,
  oversToBalls,
  phaseBandsForFormat,
  aggregatePhase,
  speedUpliftPct,
} from "@/lib/calc";
import { getPlayer, matchMeta, phases, players } from "@/lib/data";
import { buildExplorerView, explorerInnings } from "@/lib/innings";
import { matchEvidence } from "@/lib/match-graph";
import { hasWord } from "@/lib/format";
import { playerAliases, searchPlayerList } from "@/lib/player-search";
import { copilotEvidenceScope } from "@/lib/service/evidence-scope";
import type { Answer, AnswerOptions, AskMode, HistoricalMatchSummary, Player } from "@/lib/types";

function demoProvenance(): string {
  return copilotEvidenceScope().provenanceNote;
}

function cite(...ids: string[]) {
  return matchEvidence
    .filter((item) => ids.includes(item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
      kind: item.kind,
    }));
}

function finalize(answer: Answer, extras?: Partial<Answer>): Answer {
  const scope = copilotEvidenceScope();
  const method =
    extras?.method ??
    answer.method ??
    (scope.llmEnabled ? answer.method : undefined) ??
    "rule-engine";
  // Never claim llm-explain unless configured — stub path stays rule/calc
  const safeMethod =
    method === "llm-explain" && !scope.llmEnabled ? "rule-engine" : method;
  return {
    ...answer,
    method: safeMethod,
    provenanceNote: extras?.provenanceNote ?? answer.provenanceNote ?? scope.provenanceNote,
    evidence: extras?.evidence ?? answer.evidence,
    speaker: extras?.speaker ?? answer.speaker,
  };
}

/** High-priority short tokens for demo Copilot paths (kept for stable phrasing). */
const priorityEntities: { words: string[]; id: string }[] = [
  { words: ["root"], id: "joe-root" },
  { words: ["brook"], id: "harry-brook" },
  { words: ["bumrah"], id: "jasprit-bumrah" },
  { words: ["kohli"], id: "virat-kohli" },
  { words: ["rohit"], id: "rohit-sharma" },
  { words: ["stokes"], id: "ben-stokes" },
  { words: ["jadeja"], id: "ravindra-jadeja" },
  { words: ["head"], id: "travis-head" },
  { words: ["williamson"], id: "kane-williamson" },
  { words: ["smith"], id: "steve-smith" },
  { words: ["warner"], id: "david-warner" },
  { words: ["starc"], id: "mitchell-starc" },
  { words: ["cummins"], id: "pat-cummins" },
  { words: ["rabada"], id: "kagiso-rabada" },
  { words: ["shaheen", "afridi"], id: "shaheen-afridi" },
  { words: ["sangakkara", "sanga"], id: "kumar-sangakkara" },
  { words: ["potts"], id: "matthew-potts" },
  { words: ["kuldeep"], id: "kuldeep-yadav" },
  { words: ["babar"], id: "babar-azam" },
  { words: ["sachin", "tendulkar"], id: "sachin-tendulkar" },
  { words: ["gill"], id: "shubman-gill" },
  { words: ["pant"], id: "rishabh-pant" },
  { words: ["dhoni"], id: "ms-dhoni" },
  { words: ["shakib"], id: "shakib-al-hasan" },
  { words: ["rashid"], id: "rashid-khan" },
];

function findEntities(query: string): Player[] {
  const found = new Map<string, Player>();

  for (const entity of priorityEntities) {
    if (entity.words.some((word) => hasWord(query, word))) {
      const player = getPlayer(entity.id);
      if (player) found.set(player.id, player);
    }
  }

  // Surname / alias / historical coverage from the searchable catalog
  for (const player of players) {
    if (found.has(player.id)) continue;
    const parts = player.name.toLowerCase().split(/\s+/);
    const last = parts[parts.length - 1] ?? "";
    const aliases = playerAliases[player.id] ?? [];
    if (
      (last.length >= 4 && hasWord(query, last)) ||
      aliases.some((alias) => alias.length >= 3 && hasWord(query, alias))
    ) {
      found.set(player.id, player);
    }
  }

  // Multi-word name fragments via ranked search (e.g. "don bradman")
  for (const player of searchPlayerList(players, query, { minChars: 3, limit: 6 })) {
    found.set(player.id, player);
  }

  return Array.from(found.values());
}

function follow(list: string[]): string[] {
  return list;
}

function wantsDemoPlayground(query: string, options?: AnswerOptions): boolean {
  if (options?.demoPlayground) return true;
  return (
    query.includes("demo playground") ||
    query.includes("demo board") ||
    query.includes("demo sim") ||
    (query.includes("demo") &&
      (query.includes("lord") || query.includes("england") || query.includes("script")))
  );
}

function asksForInventedFacts(query: string): boolean {
  return (
    /\b245\b/.test(query) ||
    /\b89\b/.test(query) ||
    query.includes("win model") ||
    query.includes("win %") ||
    query.includes("win percent") ||
    query.includes("win probability") ||
    query.includes("live score") ||
    query.includes("current score") ||
    ((hasWord(query, "today") || hasWord(query, "now") || hasWord(query, "live")) &&
      (hasWord(query, "score") ||
        hasWord(query, "match") ||
        hasWord(query, "winning") ||
        hasWord(query, "england") ||
        hasWord(query, "india"))) ||
    query.includes("30 second") ||
    query.includes("thirty second") ||
    ((hasWord(query, "summarise") || hasWord(query, "summarize")) &&
      (hasWord(query, "today") || hasWord(query, "week"))) ||
    query.includes("everything important about england") ||
    (hasWord(query, "england") &&
      (hasWord(query, "winning") || hasWord(query, "week")) &&
      !query.includes("demo"))
  );
}

function noDatasetAnswer(followups?: string[]): Answer {
  return {
    headline: "I don't have that in the dataset",
    paragraphs: [
      "Live and historical numerical facts require a configured licensed provider (CRICKETOS_DATA_PROVIDER=cricapi + CRICKETOS_DATA_API_KEY).",
      "Cricket Intelligence will not invent match scores, player stats, win probabilities, or AI briefings. Open the labelled DEMO playground only if you want the scripted Lord’s illustration — it is never treated as live truth.",
    ],
    followups: follow(
      followups ?? [
        "What fixtures are available?",
        "What data do you have?",
        "Tell me about the DEMO playground",
      ],
    ),
    speaker: "Truth mode · Copilot",
    method: "rule-engine",
  };
}

function providerFixtureAnswer(options?: AnswerOptions): Answer | null {
  const hist = (options?.historicalMatches ?? []).filter(
    (m) => m.freshness !== "DEMO" && !m.id.startsWith("seed-") && !m.id.startsWith("demo-"),
  );
  if (!options?.providerReady) return null;
  if (!hist.length) {
    return {
      headline: "Provider keyed — no fixtures in the current dataset pull",
      paragraphs: [
        "A licensed provider is configured, but I don't have fixture rows loaded yet. Refresh Live Scores or wait for the next poll of /api/fixtures.",
      ],
      followups: follow(["What fixtures are available?", "List historical matches"]),
      speaker: "Provider · Copilot",
      method: "rule-engine",
    };
  }
  const live = hist.filter((m) => m.freshness === "LIVE");
  const lines = hist.slice(0, 6).map(formatHistoricalLine);
  return {
    headline:
      live.length > 0
        ? `${live.length} match${live.length === 1 ? "" : "es"} live from the provider`
        : `${hist.length} fixture${hist.length === 1 ? "" : "s"} from the provider`,
    paragraphs: [
      "Figures below come from the normalised provider feed — not authored fiction.",
      ...lines,
    ],
    followups: follow(["What fixtures are available?", "List historical matches"]),
    speaker: "Provider · Copilot",
    method: "rule-engine",
    evidence: hist.slice(0, 3).map((m) => ({
      id: m.id,
      label: m.title,
      detail: `${m.venue} · ${m.freshness}${m.score ? ` · ${m.score.runs}/${m.score.wickets}` : ""}`,
      kind: "fact" as const,
    })),
  };
}

export function answerQuestion(
  raw: string,
  mode: AskMode,
  twinId: string,
  options?: AnswerOptions,
): Answer {
  return finalize(answerQuestionInner(raw, mode, twinId, options));
}

function answerQuestionInner(
  raw: string,
  mode: AskMode,
  twinId: string,
  options?: AnswerOptions,
): Answer {
  const query = raw.trim().toLowerCase();
  const named = findEntities(query);
  const twin = getPlayer(twinId) ?? players[0];
  const demoOk = wantsDemoPlayground(query, options);
  const providerReady = Boolean(options?.providerReady);

  if (
    query.includes("what data") ||
    query.includes("what fixtures") ||
    query.includes("do you have")
  ) {
    const fromProvider = providerFixtureAnswer(options);
    if (fromProvider) return fromProvider;
    return {
      headline: "Truth mode — no licensed provider key",
      paragraphs: [
        "I do not have live or verified historical match scores in the product dataset.",
        "Add CRICKETOS_DATA_PROVIDER=cricapi and CRICKETOS_DATA_API_KEY, then confirm GET /api/health shows demoMode: false.",
        "Optional: open the labelled DEMO playground for a scripted Lord’s illustration — it is not live truth.",
      ],
      followups: follow(["Tell me about the DEMO playground", "Closest trajectory to Babar"]),
      speaker: "Truth mode · Copilot",
      method: "rule-engine",
    };
  }

  if (query.includes("demo playground") || (query.includes("demo") && query.includes("lord"))) {
    return {
      headline: "DEMO playground is a quarantined illustration",
      paragraphs: [
        `The Lord's England vs India board (${matchMeta.score.runs}/${matchMeta.score.wickets} in the script) is labelled DEMO — not a live score or official record.`,
        "Open it from Cricket Today → Try DEMO playground (#demo). Product fixtures stay empty until a provider key is set.",
      ],
      figures: [
        { label: "DEMO score", value: `${matchMeta.score.runs}/${matchMeta.score.wickets}` },
        { label: "Label", value: "DEMO" },
      ],
      followups: follow(["What data do you have?", "What fixtures are available?"]),
      speaker: "DEMO playground · labelled",
      method: "rule-engine",
      provenanceNote: "DEMO playground only — not provider truth.",
    };
  }

  // Contextual Match Intelligence focus (DEMO only for numerical claims)
  const focus = options?.matchFocus;
  if (
    focus?.isDemo &&
    demoOk &&
    (query.includes("situation") ||
      query.includes("this demo") ||
      query.includes("this match") ||
      query.includes("what's happening") ||
      query.includes("what is happening"))
  ) {
    return {
      headline: `DEMO situation · ${focus.title}`,
      paragraphs: [
        `Focus: ${focus.title} at ${focus.venue ?? "Lord's"} — labelled DEMO, never LIVE.`,
        focus.score
          ? `Scripted scoreline ${focus.score.runs}/${focus.score.wickets}${
              focus.score.overs ? ` (${focus.score.overs} ov)` : ""
            }. Source: ${focus.provenance?.source ?? "bundled demo dataset"}.`
          : "No scoreline on this DEMO focus row.",
        "Figures are from the quarantined playground dataset — not a licensed feed. Open Timeline · Graph for event evidence, or What-If for transparent rate assumptions.",
      ],
      figures: focus.score
        ? [
            { label: "DEMO score", value: `${focus.score.runs}/${focus.score.wickets}` },
            { label: "Freshness", value: focus.freshness },
          ]
        : [{ label: "Freshness", value: focus.freshness }],
      followups: follow([
        "What are the turning points?",
        "Tell me about the DEMO playground",
        "What data do you have?",
      ]),
      speaker: "Match focus · DEMO",
      method: "rule-engine",
      evidence: cite("ev-root-innings", "ev-phase-2230").slice(0, 2),
      provenanceNote: "DEMO match focus — not provider truth.",
    };
  }

  if (focus && focus.isSeed && !demoOk && !providerReady) {
    if (
      query.includes("situation") ||
      query.includes("this match") ||
      query.includes(focus.title.toLowerCase().slice(0, 12))
    ) {
      return {
        headline: "Seed archive is not Copilot evidence",
        paragraphs: [
          `You have Match Intelligence focus on “${focus.title}” (${focus.freshness}).`,
          "Seeded archive rows are browseable for titles, venues, and summary scores, but Cricket Intelligence does not treat them as verified Copilot evidence or live facts.",
          "Configure a licensed provider for fixture-backed answers, or open the labelled DEMO playground for the scripted illustration.",
        ],
        followups: follow([
          "What data do you have?",
          "Tell me about the DEMO playground",
        ]),
        speaker: "Truth mode · seed quarantine",
        method: "rule-engine",
      };
    }
  }

  // Refuse invented current-match / win-model / DEMO-board facts outside provider or playground
  if (!providerReady && !demoOk && asksForInventedFacts(query)) {
    return noDatasetAnswer();
  }

  if (!providerReady && !demoOk && (mode === "predictions" || mode === "fantasy" || mode === "historical")) {
    return noDatasetAnswer([
      "What data do you have?",
      "Tell me about the DEMO playground",
      "Closest trajectory to Babar",
    ]);
  }

  // Truth mode: player answers without verified stats — name / era / role / blurb only
  if (!providerReady && !demoOk && named.length > 0) {
    const player = named[0];
    return {
      headline: `${player.name} · catalog profile`,
      paragraphs: [
        `${player.name} — ${player.role}, ${player.span}. ${player.blurb}`,
        player.catalogStub || !player.statsVerified
          ? "I don't have verified official stats in the dataset for this profile. DNA percentages and form series are not shown as facts."
          : "Ask with a provider key configured for fixture-linked facts.",
      ],
      followups: follow([
        "What data do you have?",
        "Tell me about the DEMO playground",
        `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`,
      ]),
      speaker: "Catalog · truth mode",
      method: "rule-engine",
    };
  }

  if (!providerReady && !demoOk) {
    return noDatasetAnswer();
  }

  if (providerReady && !demoOk) {
    if (asksForInventedFacts(query) || query.includes("fixture") || query.includes("available")) {
      const fromProvider = providerFixtureAnswer(options);
      if (fromProvider) return fromProvider;
    }
    if (named.length > 0) {
      const player = named[0];
      return {
        headline: `${player.name}`,
        paragraphs: [
          `${player.name} — ${player.role}, ${player.span}. ${player.blurb}`,
          player.statsVerified
            ? "Ask about a fixture from the provider feed for match-linked facts."
            : "Illustrative model profile — not official stats. Fixture facts come only from the provider feed.",
        ],
        followups: follow(["What fixtures are available?", `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`]),
        speaker: "Provider mode · Copilot",
        method: "rule-engine",
      };
    }
    return noDatasetAnswer(["What fixtures are available?", "What data do you have?"]);
  }

  // Remaining paths are DEMO playground–scoped (demoOk) and must stay labelled DEMO.
  const phaseLead = cumulativePhaseLead(phases);
  const phaseRows = analysePhases(phases);
  const surge = phaseRows.find((row) => row.label.includes("22–30"));
  const bumrahUplift = speedUpliftPct(146.2, 134.1);
  const explorerView = buildExplorerView({
    matchId: matchMeta.id,
    inningsId: explorerInnings[0]?.meta.id ?? "eng-1",
    team: "all",
    player: "all",
    phaseId: "all",
  });
  const richestOver = explorerView.manhattan.reduce(
    (best, over) => (over.runs > best.runs ? over : best),
    explorerView.manhattan[0] ?? { overNumber: 0, runs: 0, wickets: 0, balls: 0, fours: 0, sixes: 0, startRuns: 0, endRuns: 0, events: [] },
  );
  const scoreEffectEvents = explorerView.worm.filter((p) => p.isWicket || (p.isBoundary && p.graphEventId));

  // ── Explorer / What-If grounded intents (reuse calc + innings modules) ──

  if (
    (hasWord(query, "most") && (hasWord(query, "runs") || hasWord(query, "run")) && hasWord(query, "over")) ||
    query.includes("richest over") ||
    query.includes("which over scored")
  ) {
    if (!explorerView.manhattan.length) {
      return finalize({
        headline: "No over series available",
        paragraphs: [
          "The DEMO board has no Manhattan series for that filter. Open Explorer when an innings file exists.",
        ],
        followups: follow(["How did the run rate change by phase?", "Show Match Graph turning points"]),
        method: "deterministic-calc",
        evidence: cite("ev-phase-2230"),
      });
    }
    return finalize({
      headline: `Over ${richestOver.overNumber} scored the most — ${richestOver.runs} runs`,
      paragraphs: [
        `From the DEMO England 1st innings Manhattan: over ${richestOver.overNumber} has ${richestOver.runs} runs` +
          (richestOver.wickets ? ` and ${richestOver.wickets} wicket(s)` : "") +
          (richestOver.events[0]?.label ? ` (${richestOver.events[0].label})` : "") +
          ".",
        "Open Explorer → Manhattan and click that over to jump to Match Graph when a linked event exists.",
      ],
      figures: [
        { label: "Over", value: String(richestOver.overNumber) },
        { label: "Runs", value: String(richestOver.runs) },
        { label: "Wickets", value: String(richestOver.wickets) },
        { label: "Boundaries", value: String(richestOver.fours + richestOver.sixes) },
      ],
      confidence: 90,
      followups: follow([
        "How did the run rate change by phase?",
        "What was the largest score-effect event?",
        "Compare phase run rates in this innings",
      ]),
      method: "deterministic-calc",
      evidence: cite("ev-over-27", "ev-phase-2230"),
      provenanceNote: demoProvenance() + " · Explorer Manhattan",
    });
  }

  if (
    (query.includes("run rate") && (hasWord(query, "phase") || hasWord(query, "change"))) ||
    query.includes("phase run") ||
    (hasWord(query, "compare") && hasWord(query, "innings")) ||
    query.includes("compare phase")
  ) {
    const bands = phaseBandsForFormat("test", explorerView.manhattan.length || 49);
    const rows = bands.map((band) => aggregatePhase(explorerView.innings?.overs ?? [], band));
    const hottest = rows.reduce((best, row) => (row.rpo > best.rpo ? row : best), rows[0]);
    const coolest = rows.reduce((best, row) => (row.rpo < best.rpo ? row : best), rows[0]);
    if (!rows.length || !explorerView.innings) {
      return finalize({
        headline: "Can't answer from this dataset",
        paragraphs: [
          "Phase aggregation needs an innings over series. This DEMO only ships England 1st innings — India compare is unavailable.",
        ],
        followups: follow(["Which over scored the most runs?"]),
        method: "deterministic-calc",
      });
    }
    return finalize({
      headline: `Phase rate swing: ${hottest.band.label} at ${formatMetric(hottest.rpo)} RPO`,
      paragraphs: [
        `Test bands (not LO powerplay/death): hottest ${hottest.band.label} (${hottest.runs} runs @ ${formatMetric(hottest.rpo)} RPO, ${hottest.wickets} wkts). Quietest ${coolest.band.label} @ ${formatMetric(coolest.rpo)} RPO.`,
        `Session model table still shows overs 22–30 at ${surge?.scored ?? 72} vs ${surge?.expected ?? 48} expected (delta ${surgeDeltaDisplay(surge)}). Cumulative phase lead ${phaseLead > 0 ? `+${phaseLead}` : phaseLead}.`,
        "India innings compare: not in the DEMO file — Explorer shows an honest empty state for that filter.",
      ],
      figures: rows.slice(0, 4).map((row) => ({
        label: row.band.label,
        value: `${row.runs} @ ${formatMetric(row.rpo)}`,
      })),
      confidence: 88,
      followups: follow([
        "Which over scored the most runs?",
        "What was the largest score-effect event?",
        "Required rate for 105 off 120 balls",
      ]),
      method: "deterministic-calc",
      evidence: cite("ev-phase-2230", "ev-over-27"),
      provenanceNote: demoProvenance() + " · Explorer phase bands",
    });
  }

  if (
    query.includes("score-effect") ||
    query.includes("score effect") ||
    (hasWord(query, "largest") && (hasWord(query, "event") || hasWord(query, "swing") || hasWord(query, "moment")))
  ) {
    const brook = scoreEffectEvents.find((p) => p.eventLabel?.toLowerCase().includes("brook"));
    const surgePoint = scoreEffectEvents.find((p) => p.graphEventId === "evt-over-27") ?? scoreEffectEvents[0];
    return finalize({
      headline: "Largest DEMO score-effect: overs 22–30 (+24 vs model)",
      paragraphs: [
        `The session model marks overs 22–30 as +24 vs expectation — most of the +${phaseLead} cumulative lead. Over 27 (14 off Jadeja) is the chart spike linked on Match Graph.`,
        brook
          ? `Brook’s dismissal at ${brook.overs} (${brook.cumulativeRuns}/${brook.wickets}) stopped the stand without giving the phase back.`
          : "Brook’s dismissal at 47.5 stopped the stand without giving the phase back.",
        "Open Explorer → Scoring progression (gold wickets / lime boundaries) or Match Graph node “Overs 22–30 surge”.",
      ],
      figures: [
        { label: "Phase delta", value: surge ? `+${surge.scored - surge.expected}` : "+24" },
        { label: "Cumulative lead", value: phaseLead > 0 ? `+${phaseLead}` : String(phaseLead) },
        { label: "Spike over", value: surgePoint ? surgePoint.overs : "27" },
      ],
      confidence: 87,
      followups: follow(["Which over scored the most runs?", "How did the run rate change by phase?"]),
      method: "deterministic-calc",
      evidence: cite("ev-phase-2230", "ev-over-27", "ev-brook-kuldeep"),
    });
  }

  if (
    query.includes("required rate") ||
    query.includes("required run") ||
    (hasWord(query, "rrr") && (hasWord(query, "need") || hasWord(query, "for") || query.includes("off"))) ||
    (hasWord(query, "need") && hasWord(query, "off") && (hasWord(query, "ball") || hasWord(query, "over"))) ||
    /required rate for\s+\d+/i.test(raw) ||
    /\d+\s+off\s+\d+\s+balls?/i.test(query)
  ) {
    const parsed = parseChaseQuery(query, raw);
    const analysis = analyseChase(parsed);
    return finalize({
      headline:
        analysis.status === "ok"
          ? `RRR ${formatMetric(analysis.requiredRunRate)} · ${analysis.oversRemaining} ov left`
          : `Situation: ${analysis.status}`,
      paragraphs: [
        analysis.plainLanguage,
        ...analysis.alternatives.slice(0, 2).map((a) => `${a.label}: ${a.detail}`),
        "This is chase arithmetic (hypothetical if not the live equation) — open Labs to edit Conservative / Baseline / Aggressive assumed RPO. Not a win probability.",
      ],
      figures: [
        { label: "Runs needed", value: String(analysis.runsRequired) },
        { label: "Balls left", value: String(analysis.ballsRemaining) },
        { label: "RRR", value: formatMetric(analysis.requiredRunRate) },
        { label: "Overs left", value: analysis.oversRemaining },
      ],
      confidence: analysis.valid ? 92 : 40,
      followups: follow([
        "Required rate for 105 off 120 balls with 7 wickets",
        "Which over scored the most runs?",
        "How did the run rate change by phase?",
      ]),
      method: "deterministic-calc",
      evidence: cite("ev-win-model"),
      provenanceNote: demoProvenance() + " · What-If calc module",
    });
  }

  if (hasWord(query, "explorer") || query.includes("manhattan") || query.includes("worm chart")) {
    return finalize({
      headline: "Explorer is on the DEMO England innings",
      paragraphs: [
        `Cricket Explorer (#explorer) plots scoring progression, Manhattan, and Test phase bands for ${matchMeta.title}. Totals: ${explorerView.totals.runs}/${explorerView.totals.wickets} in ${explorerView.totals.overs} @ ${formatMetric(explorerView.totals.rpo)} RPO.`,
        "Click chart points to open Match Graph events. Ask for most runs in an over, phase rate changes, or a required-rate situation.",
      ],
      figures: [
        { label: "Runs", value: String(explorerView.totals.runs) },
        { label: "RPO", value: formatMetric(explorerView.totals.rpo) },
        { label: "Top over", value: `${richestOver.overNumber} (${richestOver.runs})` },
      ],
      followups: follow([
        "Which over scored the most runs?",
        "How did the run rate change by phase?",
        "Required rate for 105 off 120 balls",
      ]),
      method: "deterministic-calc",
      evidence: cite("ev-phase-2230"),
    });
  }

  if (
    query.includes("30 second") ||
    query.includes("thirty second") ||
    (hasWord(query, "summarise") || hasWord(query, "summarize")) &&
      (hasWord(query, "today") || hasWord(query, "cricket"))
  ) {
    return {
      headline: "Cricket week in 30 seconds",
      paragraphs: [
        `Multi-team slate: India (Bumrah peak window, Kohli chase DNA), Australia (pace battery prior for Centurion), West Indies white-ball nights, IPL franchise follows, and India Women / Australia Women openers with Mandhana timing.`,
        `Optional Lord’s DEMO board: England ${matchMeta.score.runs}/${matchMeta.score.wickets}, phase lead ${phaseLead > 0 ? `+${phaseLead}` : phaseLead}, Bumrah ${bumrahUplift}% above career speed in that file — labelled DEMO, not LIVE.`,
        "Live Scores board polls fixtures/matches; real LIVE needs CRICKETOS_DATA_API_KEY. Seeded archive covers WI, IPL, women’s finals, and classic Tests.",
      ],
      figures: [
        { label: "DEMO score", value: `${matchMeta.score.runs}/${matchMeta.score.wickets}` },
        { label: "Bumrah uplift", value: `${bumrahUplift}%` },
        { label: "Formats", value: "Test · T20 · ODI · IPL" },
      ],
      confidence: 88,
      followups: follow([
        "Why is Bumrah difficult to face?",
        "How does Kohli build a chase?",
        "Tell me everything important about women's cricket this week",
      ]),
      speaker: "Daily briefing · multi-team",
      method: "deterministic-calc",
      evidence: cite("ev-phase-2230", "ev-win-model"),
    };
  }

  if (
    query.includes("women") ||
    hasWord(query, "mandhana") ||
    hasWord(query, "perry") ||
    (hasWord(query, "healy") && hasWord(query, "alyssa"))
  ) {
    return {
      headline: "Women's cricket is a first-class briefing subject",
      paragraphs: [
        "India Women open with Mandhana's timing; Harmanpreet anchors the middle. Australia Women still set the system prior — Perry all-round gravity, Healy powerplay tempo.",
        "Seeded archive includes Australia Women vs England Women (2022 final). Follow IND-W / AUS-W in onboarding or Feed and the home briefing rotates with them.",
        "This is not a Root-only product lane — women's cricket sits beside IPL, WI, and men's internationals on the Live Scores board.",
      ],
      followups: follow([
        "Where does Mandhana sit among openers?",
        "Closest trajectory to Babar",
        "Summarise today's cricket in 30 seconds",
      ]),
      speaker: "Women's cricket · curated",
      method: "rule-engine",
    };
  }

  if (
    (hasWord(query, "england") &&
      (hasWord(query, "week") || hasWord(query, "important") || hasWord(query, "everything") || hasWord(query, "tell"))) ||
    query.includes("everything important about england")
  ) {
    return {
      headline: "England this week, without the noise",
      paragraphs: [
        "The Lord’s Test is the centre of the week. England are 245 for 4, ahead of the model, with Root building the innings that usually becomes a lead. Stokes is live; Brook’s 64 already did the tempo job.",
        "Squad health: Woakes is a calf concern (40% availability). Potts is the day-three differential. Stokes bowls in bursts only. Root is 73 from 14,000 Test runs — that is the personal headline inside the team one.",
        "Style file unchanged: aggression 92, tempo 89, nearest historical analogue still 2005 Australia at 81%. The brake pedal they actually use is Root’s 89 not out.",
      ],
      figures: [
        { label: "Match position", value: "245/4" },
        { label: "Win model", value: "58%" },
        { label: "Root to 14k", value: "73 runs" },
        { label: "Woakes avail.", value: "40%" },
      ],
      confidence: 84,
      followups: follow([
        "Why is England winning?",
        "Show Stokes' best chases",
        "Most similar to Root",
      ]),
      speaker: "Personal briefing",
    };
  }

  if (
    hasWord(query, "bumrah") &&
    (hasWord(query, "difficult") ||
      hasWord(query, "dominat") ||
      hasWord(query, "why") ||
      hasWord(query, "effective") ||
      hasWord(query, "peak") ||
      hasWord(query, "face") ||
      hasWord(query, "today") ||
      hasWord(query, "fast"))
  ) {
    return {
      headline: "Bumrah is difficult because the leave stops being safe",
      paragraphs: [
        "He is bowling at 146.2 kph — 9% faster than his career mean of 134.1. The hard length arrives before a batter’s weight can settle forward, and the same run-up still produces the yorker.",
        "The Twin reads every spell as three moves: a ball at the hip, a ball at the top of off, and a yorker only after the batter’s weight is back. He does not search for swing for six balls. He waits until the leave gets late.",
        "Today he already has Crawley and Duckett. He has not yet bowled the session that decides the lead — which is why removing him collapses India’s win chance from 42% to 18%. Difficulty is the release, the patience, and the fact the model moves when he decides to bowl.",
      ],
      figures: [
        { label: "Speed vs career", value: "+9%" },
        { label: "Wickets today", value: "2" },
        { label: "Win without him", value: "18%" },
        { label: "Peak age", value: "32" },
      ],
      confidence: 86,
      followups: follow([
        "What if Bumrah is unavailable?",
        "How does he bowl to Root?",
        "Who likely scores next?",
      ]),
    };
  }

  if (hasWord(query, "stokes") && (hasWord(query, "chase") || hasWord(query, "best") || query.includes("headingley"))) {
    return {
      headline: "Stokes' best chases are ugly on purpose",
      paragraphs: [
        "Headingley 2019 remains the reference: England needed 359, were 286 for 9, and Stokes scored in the V until the bowler went short — then he hooked. The Twin still treats that as the template, not a miracle.",
        "The pattern in the file: eight quiet balls, then the shot that tells the field the plan has changed. He trusts deep midwicket to be wrong once. Most days the fielder is right twice and wrong once, and once is enough.",
        "Away from home the batting gets braver as the lead shrinks. Today he is 3 not out with Kuldeep live — the first fifteen balls of wrist spin are the chase-before-the-chase. Survive those, and the Headingley grammar comes back into range.",
      ],
      figures: [
        { label: "Signature chase", value: "Headingley '19" },
        { label: "Mental DNA", value: "98" },
        { label: "Today", value: "3*" },
        { label: "Live risk window", value: "15 balls" },
      ],
      confidence: 83,
      followups: follow([
        "Who likely scores next?",
        "Why is England winning?",
        "How does Stokes play Kuldeep?",
      ]),
      speaker: "Chase file",
    };
  }

  if (
    (hasWord(query, "sachin") || hasWord(query, "tendulkar")) &&
    (hasWord(query, "kohli") || hasWord(query, "24") || hasWord(query, "age"))
  ) {
    return {
      headline: "Sachin at 24 vs Kohli at 24: library vs decision",
      paragraphs: [
        "Sachin at 24 already had a full international vocabulary — leave, drive, pull, late cut — and thousands of international runs. He treated bowling plans as information. Once read, he scored without needing the plan to fail first.",
        "Kohli at 24 was already playing innings that felt like a decision. The chase file was forming: strike rotation until the field spread, boundaries as release. Output was elite; the grammar was hunger, not archive.",
        "The useful comparison is not who was 'better'. Sachin at 24 was building a library. Kohli at 24 was building a chase identity. Root at 25 sat between them on output and resembled neither on style — which is why Brook is being asked to be both, and the model doubts that path.",
      ],
      figures: [
        { label: "Sachin @24 shape", value: "Library" },
        { label: "Kohli @24 shape", value: "Chase" },
        { label: "Likeness now", value: "76%" },
        { label: "Age curve ref", value: "Sachin" },
      ],
      confidence: 78,
      followups: follow([
        "Compare Root and Kohli at age 25",
        "Closest trajectory to Babar",
        "Explain Kohli's chases",
      ]),
      speaker: "Age curve",
    };
  }

  if (
    hasWord(query, "babar") &&
    (hasWord(query, "similar") ||
      hasWord(query, "trajectory") ||
      hasWord(query, "closest") ||
      hasWord(query, "like") ||
      mode === "career" ||
      named.length === 1)
  ) {
    const babar = getPlayer("babar-azam")!;
    return {
      headline: "Closest trajectory to Babar: Root on control, Kohli on appetite",
      paragraphs: [
        "Babar’s file is timing-first control batting with a captain’s load. Against the living game, Joe Root is the nearest trajectory at 78% — late hands, staged risk, innings built before they are spent.",
        "Weight chase appetite instead and Kohli rises to 74%. Babar shrinks a chase to singles before he finishes it; Kohli’s pattern is similar in patience, louder in intent after over 35.",
        "Williamson sits at 72% for the same leave-first grammar. Coverage note: Babar is not in this Lord’s XI — the answer is from his career DNA and similarity graph, not today’s scorecard.",
      ],
      figures: babar.similar.map((item) => ({
        label: getPlayer(item.id)?.name ?? item.id,
        value: `${item.score}%`,
      })),
      confidence: 77,
      followups: follow([
        "Most similar to Root",
        "Sachin at 24 vs Kohli",
        "Project Babar's career",
      ]),
      speaker: "Trajectory",
    };
  }

  if (
    (hasWord(query, "england") && (hasWord(query, "winning") || hasWord(query, "win") || hasWord(query, "ahead"))) ||
    query.includes("turning point") ||
    query.includes("turning points") ||
    (hasWord(query, "project") && (hasWord(query, "score") || hasWord(query, "final"))) ||
    query.includes("final score") ||
    (hasWord(query, "likely") && (hasWord(query, "score") || hasWord(query, "next"))) ||
    query.includes("who scores next") ||
    query.includes("who likely scores")
  ) {
    const wantsNext = hasWord(query, "next") || query.includes("scores next");
    const wantsProject = hasWord(query, "project") || query.includes("final score");
    const wantsTurning = query.includes("turning");

    if (wantsNext) {
      return {
        headline: "Stokes is the most likely next scorer — with the widest range",
        paragraphs: [
          "Root is set on 89*, so he remains the favourite to be top scorer. The next meaningful chunk of runs, though, is more likely to come from Stokes if he survives Kuldeep’s first fifteen balls.",
          "Model split for the next 30 runs from the strike: Stokes 54%, Root 38%, extras/other 8%. Stokes’ ceiling is a burst; his floor is an edge to gully before lunch.",
          "Bumrah is the other 'scorer' in the hour — wickets count as anti-runs. A wicket in his first four overs moves the match more than thirty quiet singles.",
        ],
        figures: [
          { label: "Stokes next chunk", value: "54%" },
          { label: "Root top scorer", value: "61%" },
          { label: "Danger bowler", value: "Bumrah 72%" },
        ],
        confidence: 71,
        followups: follow([
          "Project the final score",
          "Why is England winning?",
          "Show Stokes' best chases",
        ]),
        speaker: "Predictions",
      };
    }

    if (wantsProject) {
      return {
        headline: "Projected England total: 338 — with a long tail",
        paragraphs: [
          "Base case with Root set and Stokes surviving the wrist-spin window: England 338 all out. Band: 305 (Bumrah burst works) to 372 (Root to 140+, lower order 80).",
          "The projection leans on overs 22–30 already being in the book (+21 vs model) and on Bumrah’s spell being capped. If he bowls uncapped and takes two more, the mean drops toward 310.",
          "Rain at 34% for the back end does not change the projected total as much as it changes whether India ever bat into a result.",
        ],
        figures: [
          { label: "Base total", value: "338" },
          { label: "Low / high", value: "305–372" },
          { label: "Eng win @338", value: "63%" },
        ],
        confidence: 69,
        followups: follow([
          "What are the turning points?",
          "Who likely scores next?",
          "What if Bumrah is unavailable?",
        ]),
        speaker: "Predictions",
      };
    }

    if (wantsTurning) {
      const surgeDelta = surge?.delta ?? 24;
      return {
        headline: "Three turning points — one already played (DEMO)",
        paragraphs: [
          `Already played: overs 22–30. England scored ${surge?.scored ?? 72} against ${surge?.expected ?? 48} expected (delta ${surgeDelta > 0 ? `+${surgeDelta}` : surgeDelta}). Root through Jadeja, Brook forcing a plan change. Cumulative phase lead: ${phaseLead > 0 ? `+${phaseLead}` : phaseLead}.`,
          "Next in the demo script: Bumrah’s first four overs after the break against Root and Stokes. A wicket here swings the hour; thirty quiet runs do not.",
          "Pending: Stokes vs Kuldeep’s remaining balls in the fifteen-ball risk window, and whether rain at 34% freezes the match before India bat.",
        ],
        figures: [
          { label: "Phase delta", value: `${surgeDelta > 0 ? `+${surgeDelta}` : surgeDelta} runs` },
          { label: "Cumulative", value: phaseLead > 0 ? `+${phaseLead}` : String(phaseLead) },
          { label: "Next swing", value: "Bumrah 1–4" },
          { label: "Rain risk", value: "34%" },
        ],
        confidence: 82,
        method: "deterministic-calc",
        evidence: cite("ev-phase-2230", "ev-over-27", "ev-stokes-kuldeep", "ev-win-model"),
        followups: follow([
          "Why is England winning?",
          "Project the final score",
          "Who likely scores next?",
        ]),
      };
    }

    return {
      headline: "England lead the DEMO model because the phase already moved",
      paragraphs: [
        `DEMO board ${matchMeta.score.runs}/${matchMeta.score.wickets}. Cumulative phase lead ${phaseLead > 0 ? `+${phaseLead}` : phaseLead} (sum of scored − expected). Overs 22–30: ${surge ? `${surge.scored} vs ${surge.expected}` : "72 vs 48"} expected. Root took spin out of the game; Brook made India change the ball they were bowling.`,
        `Win model: England ${matchMeta.winModel.eng}%, India ${matchMeta.winModel.ind}%. That is an authored session prior on this demo file — not a live market price.`,
        "The lead is fragile in one direction only: Bumrah. Without him India fall to 18% in the what-if table. With a wicket in his first burst, this becomes a different afternoon.",
      ],
      figures: [
        { label: "England", value: `${matchMeta.winModel.eng}%` },
        { label: "India", value: `${matchMeta.winModel.ind}%` },
        { label: "Ahead of model", value: phaseLead > 0 ? `+${phaseLead}` : String(phaseLead) },
        { label: "Key phase", value: "Ov 22–30" },
      ],
      confidence: 79,
      method: "deterministic-calc",
      evidence: cite("ev-phase-2230", "ev-win-model", "ev-root-innings"),
      followups: follow([
        "What are the turning points?",
        "Project the final score",
        "Who likely scores next?",
      ]),
    };
  }

  if ((hasWord(query, "similar") || hasWord(query, "alike") || query.includes("most similar")) && named[0]) {
    return similarAnswer(named[0]);
  }

  if (hasWord(query, "bumrah") && (query.includes("1990") || query.includes("ninet") || query.includes("90s"))) {
    return {
      headline: "Bumrah in the 1990s is a brighter, shorter career",
      paragraphs: [
        "The action would have looked strange and it would have been legal. The yorker, bowled at a release speed that decade rarely saw, arrives before a batter's weight can get forward.",
        "Reverse swing was already the away weapon. Bumrah does not need the ball to be a scrap. He creates the angle with the wrist. Against thinner batting orders the model gives him a Test average of 16.4.",
        "A 1990s board bowls him into the ground. The peak ends around 2002. Brighter, and shorter, than the one he is in now.",
      ],
      figures: [
        { label: "Modelled average", value: "16.4" },
        { label: "Five-wicket hauls", value: "31" },
        { label: "Peak ended", value: "2002" },
      ],
      confidence: 64,
      followups: follow(["Is Bumrah in his peak now?", "What happens today if he does not bowl?"]),
      speaker: "Alternate history",
    };
  }

  if (
    hasWord(query, "brook") &&
    (hasWord(query, "root") ||
      hasWord(query, "surpass") ||
      hasWord(query, "career") ||
      hasWord(query, "predict") ||
      hasWord(query, "forecast"))
  ) {
    return {
      headline: "Brook can be great. Matching Root is a 38% outcome",
      paragraphs: [
        "Joe Root had 4,594 Test runs at the age Brook is now passing through in spirit, and Brook exceeds Root's runs-per-innings pace by 14%. The rate is not the argument. The argument is the innings he gives away.",
        "The model has an elite Test career at 92%, a World XI place at 65%, and 10,000 Test runs at 76%. England captain sits at 41%. Retirement, if the body follows the batting, is 2038. Expected peak age is 29.",
        "He is on his best ten-match run. He was also dismissed today by the kind of ball the file already worried about: spin, early in the plan, taken on. Surpassing Root means learning the ugly afternoon.",
      ],
      figures: [
        { label: "Elite Test batter", value: "92%" },
        { label: "Matches Root's weight", value: "38%" },
        { label: "10,000 Test runs", value: "76%" },
        { label: "England captain", value: "41%" },
      ],
      confidence: 71,
      followups: follow(["Who is most similar to Brook?", "How did Brook get out today?"]),
    };
  }

  if (
    hasWord(query, "jadeja") &&
    (hasWord(query, "today") || hasWord(query, "important") || hasWord(query, "session") || mode === "general")
  ) {
    return {
      headline: "Jadeja matters today as the over-bank, not the wicket",
      paragraphs: [
        "He has one wicket, Pope, and Root has since taken the stock ball away from him. While Brook was in, Jadeja went at 4.2 an over without looking like breaking the stand. Kuldeep did that.",
        "His importance is the overs he lets Bumrah not bowl. If the surface grips after tea he becomes a wicket bowler again. Until then he is control, and control is being scored off without risk.",
        "Fantasy still wants him. The match model does not have him as the bowler who wins the next hour.",
      ],
      figures: [
        { label: "Importance today", value: "78" },
        { label: "Spell rate", value: "4.2 / over" },
        { label: "Wickets", value: "1" },
      ],
      confidence: 77,
      followups: follow(["How is Root playing spin?", "Who wins the next hour?"]),
    };
  }

  if ((hasWord(query, "root") && hasWord(query, "kohli")) || (query.includes("age 25") && named.length >= 1)) {
    return {
      headline: "At 25 they were level on output and nothing alike",
      paragraphs: [
        "Root at 25 had 4,594 Test runs and a method that looked like it was trying not to be noticed. Kohli at 25 was already playing innings that felt like a decision. The averages sat in the same band. The shots did not.",
        "Root's twin, even then, was a control batter in the Sangakkara line. Kohli's was a chase batter. The model still separates them that way: Root 91% similar to Sangakkara, Kohli's chase pattern unchanged after 18 years.",
        "The useful comparison is not who was better at 25. It is that Brook is being asked to be both, and the model does not think that is how either career was built.",
      ],
      figures: [
        { label: "Root at 25", value: "4,594 runs" },
        { label: "Likeness now", value: "74%" },
        { label: "Closer historical twin", value: "Sangakkara" },
      ],
      confidence: 74,
      followups: follow(["Who is most similar to Joe Root?", "Sachin at 24 vs Kohli"]),
    };
  }

  if (hasWord(query, "innings") && (hasWord(query, "best") || hasWord(query, "greatest") || query.includes("since 2000"))) {
    return {
      headline: "The innings since 2000 that the model keeps",
      paragraphs: [
        "It does not rank them by strike rate. It ranks them by how much they moved a match that was supposed to be settled, on a ground that was not helping the batter.",
        "Three stay at the top of the file. Lara's 153 in Bridgetown, because the target and the spell were both unreasonable. Stokes at Headingley in 2019, because the chase had no business being alive at tea. Kusal Perera in Durban the same year, for the same reason, with less support.",
        "Root's 89 today is not on that list. It is the kind of innings that makes those innings possible: a set batter taking a spinner out of the game so someone else can play the loud one.",
      ],
      figures: [
        { label: "Ranked by", value: "Match swing" },
        { label: "Not ranked by", value: "Strike rate" },
      ],
      confidence: 70,
      followups: follow(["Show Stokes' best chases", "How good is Root's 89?"]),
    };
  }

  if (hasWord(query, "kohli") && (hasWord(query, "chase") || hasWord(query, "approach") || hasWord(query, "explain"))) {
    return twinAnswer(getPlayer("virat-kohli") ?? twin);
  }

  if (hasWord(query, "rain")) {
    return {
      headline: "Rain is no longer a footnote",
      paragraphs: [
        "Overnight the model had rain at 18% for the back end of this match. It is 34% now. If the last two sessions are lost, the draw becomes the leading outcome at 64%, with England 22% and India 14%.",
        "That saves India from having to bowl England out, and it saves England from batting last. It also freezes Root on 89, 73 short of 14,000.",
        "Until the covers come on, the session is still a bowling problem, not a weather problem.",
      ],
      figures: [
        { label: "Rain risk", value: "34%" },
        { label: "Draw if it arrives", value: "64%" },
        { label: "Was overnight", value: "18%" },
      ],
      confidence: 68,
      followups: follow(["Who wins if they play the full day?", "Project the final score"]),
    };
  }

  if (hasWord(query, "win") || hasWord(query, "chance") || query.includes("who wins") || query.includes("full day")) {
    return {
      headline: "England 58, India 42, if they get the day",
      paragraphs: [
        "England are 245 for 4, 21 runs ahead of the phase model. The damage was done in overs 22 to 30: 72 runs against 48 expected. Root took spin out of the game. India's older-ball bowling did not pull it back.",
        "The next hour is not a coin toss. It is Bumrah against two set ideas, Root's leave and Stokes' first fifteen balls to Kuldeep. A wicket in that hour moves the model more than thirty quiet runs.",
        "If Bumrah does not bowl, this stops being a 58-42 match. India fall to 18%.",
      ],
      figures: [
        { label: "England", value: "58%" },
        { label: "India", value: "42%" },
        { label: "Ahead of model", value: "+21" },
      ],
      confidence: 73,
      followups: follow(["What if Bumrah is unavailable?", "What are the turning points?"]),
    };
  }

  if (hasWord(query, "captain") || (mode === "fantasy" && (hasWord(query, "who") || query.includes("c ")))) {
    return {
      headline: "Captain Root. Confidence 93%",
      paragraphs: [
        "Brook's 64 is already in the book. There is no second innings in this round to hand him the armband for. Root is 89 not out and batting inside a match he is winning against the model.",
        "Bumrah is the ceiling captain at 66% if you think the second spell takes two more wickets. The workload file can cap that. Jadeja is 64% and has already been managed.",
        "Potts is not a captain. He is the differential: 4% owned, 61 expected points if he bowls on day three.",
      ],
      figures: [
        { label: "Root", value: "93%" },
        { label: "Bumrah", value: "66%" },
        { label: "Jadeja", value: "64%" },
      ],
      confidence: 93,
      followups: follow(["Why is Potts the differential?", "Does Woakes change the XI?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (hasWord(query, "potts") || hasWord(query, "differential")) {
    return {
      headline: "Potts is the differential because the room has left him",
      paragraphs: [
        "Ownership is 4%. Expected return, if England bat once and he bowls into day-three footmarks, is 61 points. Woakes is the name people still pick, and Woakes has a calf that should keep him out.",
        "He is not a wicket-this-over bowler. He hits a length until the batter invents a shot. On a wearing Lord's pitch that is a job.",
        "Bashir is the safe last slot in the AI XI. Potts is the braver one, and the braver one is ahead on the model.",
      ],
      figures: [
        { label: "Ownership", value: "4%" },
        { label: "Expected points", value: "61" },
        { label: "Woakes availability", value: "40%" },
      ],
      confidence: 80,
      followups: follow(["Who should captain?", "Is Bumrah still a must-start?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (hasWord(query, "head") && hasWord(query, "bumrah")) {
    return {
      headline: "Head's first fifteen balls against Bumrah are the hole",
      paragraphs: [
        "Eleven meetings, seven dismissals, a strike rate of 87. The slash is the same fourth ball it has always been, and Bumrah now waits for it rather than searching.",
        "Dismissal risk is up 48% inside those fifteen balls. After that the matchup becomes an ordinary left-hander against a great bowler, which is still hard, but it is not the spike.",
        "Head is not in this Test. The file is here because it is the cleanest rivalry the model holds.",
      ],
      figures: [
        { label: "Meetings", value: "11" },
        { label: "Dismissals", value: "7" },
        { label: "Strike rate", value: "87" },
        { label: "Risk in 15 balls", value: "+48%" },
      ],
      confidence: 88,
      followups: follow(["Who is similar to Head?", "Why is Bumrah so effective?"]),
    };
  }

  if (query.includes("22") || query.includes("turning") || query.includes("expectation") || query.includes("ahead")) {
    return {
      headline: "Overs 22 to 30 moved the match",
      paragraphs: [
        "England scored 72 in that phase against 48 expected. It is most of the +21 they carry into this session. Root batted through Jadeja. Brook scored quickly enough that India had to change the ball they were bowling.",
        "Before it, the innings was level with the model. After it, the death of the old ball belonged to the batters. Brook then edged Kuldeep, which stopped the stand and did not give the phase back.",
        "The next shift, if there is one, is a wicket in Bumrah's first four overs. Thirty quiet runs will not do it.",
      ],
      figures: [
        { label: "Phase runs", value: "72" },
        { label: "Expected", value: "48" },
        { label: "Match delta", value: "+21" },
      ],
      confidence: 84,
      followups: follow(["Who wins from here?", "How important is Jadeja today?"]),
    };
  }

  if (query.includes("14000") || query.includes("14,000") || query.includes("fourteen")) {
    return {
      headline: "73 runs away, and he is already set",
      paragraphs: [
        "Root is 13,927. The 14,000th run is 73 away, and he is 89 not out with Stokes for company. At this rate the milestone is a session, unless Bumrah finds the hip ball or the rain arrives.",
        "The model has the landmark at 96% across the series. Today, specifically, it is about whether he faces another 90 balls. The innings he is playing is exactly the one that usually gets them.",
      ],
      figures: [
        { label: "Runs now", value: "13,927" },
        { label: "Needed", value: "73" },
        { label: "Series chance", value: "96%" },
      ],
      confidence: 82,
      followups: follow(["Will he get there if it rains?", "Who is most similar to him?"]),
    };
  }

  if (
    (hasWord(query, "england") && (hasWord(query, "dna") || hasWord(query, "style") || query.includes("2005"))) ||
    query.includes("2005")
  ) {
    return {
      headline: "This England side resembles 2005 Australia more than it resembles its own past",
      paragraphs: [
        "Aggression 92, tempo 89, pressure 88, adaptability 85, spin resistance 81. The style flags are high risk, high tempo, attack first.",
        "The nearest historical side in the model is the 2005 Australia team, at 81% similarity. Same refusal to bat time for its own sake. A higher ceiling, and a messier floor when the new ball moves.",
        "Root is the brake they actually use. Without the 89, the DNA is just a fast score and a collapse.",
      ],
      figures: [
        { label: "2005 Australia", value: "81%" },
        { label: "Aggression", value: "92" },
        { label: "Tempo", value: "89" },
      ],
      confidence: 79,
      followups: follow(["Show me the team DNA", "How does Brook fit that style?"]),
    };
  }

  if (
    query.includes("lord") ||
    (hasWord(query, "india") && (hasWord(query, "venue") || hasWord(query, "struggle") || hasWord(query, "ground")))
  ) {
    return {
      headline: "Lord's asks India to be good before they are ready",
      paragraphs: [
        "The slope takes the ball across the right-hander. The first twenty overs reward a length. India's best cricket starts once the ball is older, and Lord's does not let the ball get old for free.",
        "They have solved other away grounds with one bowler. That is why this venue and Bumrah are the same conversation. Without him the win chance is 18%.",
      ],
      figures: [
        { label: "India win chance", value: "42%" },
        { label: "Without Bumrah", value: "18%" },
      ],
      confidence: 76,
      followups: follow(["Why is Bumrah so effective?", "What if it rains?"]),
    };
  }

  if (hasWord(query, "woakes") || hasWord(query, "injury")) {
    return {
      headline: "Woakes does not start",
      paragraphs: [
        "Calf tightness, availability 40%, workload already in the red. The AI XI has locked him out. The third seamer is Potts or Atkinson, and Potts is the one the room has not picked.",
        "Bumrah's issue is different. He plays, and the spell is capped. Stokes bowls in a burst. Neither of those is a absence. Woakes is an absence.",
      ],
      figures: [
        { label: "Woakes availability", value: "40%" },
        { label: "Replacement", value: "Potts" },
      ],
      confidence: 85,
      followups: follow(["Why is Potts the differential?", "Who should captain?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (mode === "twin") {
    return twinAnswer(named[0] ?? twin);
  }

  if (named.length === 1 && (hasWord(query, "how") || hasWord(query, "explain"))) {
    return twinAnswer(named[0]);
  }

  if (named.length === 1) {
    const player = named[0];
    const topTraits = player.traits
      .slice()
      .sort((a, b) => b.level - a.level)
      .slice(0, 2)
      .map((t) => `${t.label} ${t.level}`)
      .join(" · ");
    return {
      headline: player.name,
      paragraphs: [
        player.blurb,
        player.formNote,
        `Living traits right now: ${topTraits}. ${player.report.development}`,
      ],
      figures: [
        { label: player.projection.headline, value: `${player.projection.elite}%` },
        { label: player.projection.landmark, value: `${player.projection.landmarkChance}%` },
        { label: "Peak age", value: String(player.projection.peakAge) },
        { label: player.traits[0]?.label ?? "Trait", value: String(player.traits[0]?.level ?? "—") },
      ],
      confidence: 75,
      followups: [
        `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`,
        `Project ${player.name.split(" ").slice(-1)[0]}'s career`,
      ],
      speaker: mode === "career" ? "Career forecast" : "Player intelligence",
    };
  }

  if (named.length >= 2) {
    return {
      headline: `${named[0].name} and ${named[1].name}`,
      paragraphs: [
        named[0].blurb,
        named[1].blurb,
        "Ask for the similarity, the matchup, the age curve, or the chase if you want the model to pick a side.",
      ],
      followups: [
        `Who is more like ${named[0].name.split(" ").slice(-1)[0]}?`,
        `How do they match up?`,
      ],
    };
  }

  if (mode === "fantasy") {
    return {
      headline: "The XI is already leaning on Root and Bumrah",
      paragraphs: [
        "Captain Root at 93%. Bumrah remains a must-start even with a spell cap. Potts is the differential at 4% owned and 61 expected points. Woakes stays out.",
        "Ask a narrower question if you want one slot argued.",
      ],
      followups: follow(["Who should captain?", "Why is Potts the differential?"]),
      speaker: "Fantasy copilot",
    };
  }

  if (mode === "historical") {
    const hist = options?.historicalMatches ?? [];
    const grounded = answerFromHistoricalArchive(query, hist);
    if (grounded) return grounded;
    const archiveLines =
      hist.length > 0
        ? [
            `Normalised archive has ${hist.length} match${hist.length === 1 ? "" : "es"} (DEMO + seeded HISTORICAL — not a live feed):`,
            ...hist.slice(0, 5).map((m) => formatHistoricalLine(m)),
          ]
        : [
            "Historical archive not loaded yet — open Explorer or wait for `/api/matches`. Until then, player-era prompts still use the bundled DNA file.",
          ];
    return {
      headline: hist.length
        ? "Ask about a seeded / DEMO match, a player, or a year"
        : "Name a player, a year, or a what-if",
      paragraphs: [
        ...archiveLines,
        "Player-era prompts still work across Kohli, Babar, Mandhana, Warner, Root / Sangakkara, Sachin at 24, Stokes' chases, and the 2005 likeness. LIVE scores only appear when a provider key is configured and healthy.",
      ],
      followups: follow([
        "List historical matches",
        "Sachin at 24 vs Kohli",
        "India women vs Australia women — classic finals",
        "Headingley 2019",
      ]),
      speaker: "Historical · normalised archive",
      method: "rule-engine",
      evidence: hist.slice(0, 3).map((m) => ({
        id: m.id,
        label: m.title,
        detail: `${m.venue} · ${m.freshness}${m.score ? ` · ${m.score.runs}/${m.score.wickets}` : ""}`,
        kind: m.freshness === "DEMO" ? ("demo" as const) : ("historical" as const),
      })),
      provenanceNote: demoProvenance(),
    };
  }

  if (mode === "predictions") {
    return {
      headline: "Ask for a win model, a total, or who scores next",
      paragraphs: [
        `DEMO board: England ${matchMeta.winModel.eng}%, India ${matchMeta.winModel.ind}%, projected total around 338, Stokes the likeliest next chunk of runs. Figures are from the bundled dataset.`,
      ],
      followups: follow([
        "Why is England winning?",
        "Project the final score",
        "Who likely scores next?",
      ]),
      speaker: "Predictions · DEMO",
      evidence: cite("ev-win-model"),
    };
  }

  return {
    headline: "Ask Cricket Anything",
    paragraphs: [
      "Grounded multi-team copilot — India, Aus, WI, IPL, women’s cricket, legends, plus an optional Lord’s DEMO board. Numbers come from the dataset, seeded archive, and deterministic calcs — not an inventing LLM.",
      "Try Bumrah’s difficulty, Kohli chases, Babar twins, Mandhana / women’s week, Warner powerplays, Explorer questions, or a 30-second summary. If the file can’t support an answer, it says so.",
    ],
    followups: follow([
      "Why is Bumrah difficult to face?",
      "How does Kohli build a chase?",
      "Tell me everything important about women's cricket this week",
      "Closest trajectory to Babar",
      "Summarise today's cricket in 30 seconds",
    ]),
  };
}

function similarAnswer(player: NonNullable<ReturnType<typeof getPlayer>>): Answer {
  const lines = player.similar.map((item) => {
    const other = getPlayer(item.id);
    return `${other?.name ?? item.id} at ${item.score}%. ${item.note}`;
  });
  const top = player.similar[0];
  const topName = top ? getPlayer(top.id)?.name : "no twin";
  return {
    headline: `Nearest to ${player.name}: ${topName}`,
    paragraphs: lines.length ? lines : [player.blurb],
    figures: player.similar.slice(0, 3).map((item) => ({
      label: getPlayer(item.id)?.name ?? item.id,
      value: `${item.score}%`,
    })),
    confidence: top?.score,
    followups: [
      `Project ${player.name.split(" ").slice(-1)[0]}'s career`,
      "Closest trajectory to Babar",
      "Sachin at 24 vs Kohli",
    ],
  };
}

function twinAnswer(player: NonNullable<ReturnType<typeof getPlayer>>): Answer {
  return {
    headline: player.twinLines[0],
    paragraphs: player.twinLines.slice(1).length ? player.twinLines.slice(1) : [player.blurb],
    figures: [
      { label: "Years in the file", value: String(player.twinYears) },
      { label: "Peak age", value: String(player.projection.peakAge) },
      { label: player.traits[0]?.label ?? "Trait", value: String(player.traits[0]?.level ?? "—") },
    ],
    confidence: 80,
    followups: [
      `Who is most similar to ${player.name.split(" ").slice(-1)[0]}?`,
      "Will Harry Brook surpass Root?",
    ],
    speaker: `Cricket Twin · ${player.name}`,
  };
}

function surgeDeltaDisplay(surge: { scored: number; expected: number } | undefined) {
  if (!surge) return "+24";
  const d = surge.scored - surge.expected;
  return d > 0 ? `+${d}` : String(d);
}

function formatHistoricalLine(m: HistoricalMatchSummary): string {
  const score = m.score ? `${m.score.runs}/${m.score.wickets} (${m.score.overs})` : "no score on file";
  const sides = m.teams ? `${m.teams.home} vs ${m.teams.away}` : m.title;
  return `${sides} · ${m.venue} · ${m.format} · ${m.freshness} · ${score}`;
}

/** Ground historical asks against normalised `/api/matches` rows when they match. */
function answerFromHistoricalArchive(
  query: string,
  matches: HistoricalMatchSummary[],
): Answer | null {
  if (!matches.length) return null;

  if (
    hasWord(query, "list") ||
    hasWord(query, "archive") ||
    query.includes("historical match") ||
    query.includes("seeded")
  ) {
    return {
      headline: `${matches.length} normalised matches in the archive`,
      paragraphs: [
        "These rows came through the Cricket Intelligence normalisation path (seeded HISTORICAL + DEMO board). None are labelled LIVE without a configured provider.",
        ...matches.slice(0, 8).map(formatHistoricalLine),
      ],
      followups: follow([
        matches.find((m) => /headingley/i.test(m.title + m.venue))?.title ?? "Headingley 2019",
        "Sachin at 24 vs Kohli",
        "Show Stokes' best chases",
      ]),
      speaker: "Historical · normalised archive",
      method: "rule-engine",
      evidence: matches.slice(0, 5).map((m) => ({
        id: m.id,
        label: m.title,
        detail: `${m.freshness} · ${m.provenance?.source ?? "archive"}`,
        kind: m.freshness === "DEMO" ? ("demo" as const) : ("historical" as const),
      })),
      provenanceNote: demoProvenance(),
    };
  }

  const hit = matches.find((m) => {
    const hay = `${m.title} ${m.venue} ${m.teams?.home ?? ""} ${m.teams?.away ?? ""} ${m.id}`.toLowerCase();
    const tokens = query.split(/\s+/).filter((t) => t.length > 3);
    return tokens.some((t) => hay.includes(t));
  });
  if (!hit) return null;
  if (hit.freshness === "LIVE") {
    // Honesty guard — never narrate LIVE from archive path
    return null;
  }
  return {
    headline: hit.title,
    paragraphs: [
      formatHistoricalLine(hit),
      hit.provenance?.note ??
        hit.provenance?.source ??
        "Normalised archive row — not a live broadcast feed.",
      hit.freshness === "DEMO"
        ? "This is the bundled Lord’s DEMO board used by Match Room / Explorer charts."
        : "Seeded completed result for offline historical intelligence. Add CRICKETOS_DATA_API_KEY to pull provider fixtures.",
    ],
    figures: hit.score
      ? [
          { label: "Runs / wkts", value: `${hit.score.runs}/${hit.score.wickets}` },
          { label: "Overs", value: hit.score.overs },
          { label: "Freshness", value: hit.freshness },
        ]
      : [{ label: "Freshness", value: hit.freshness }],
    followups: follow(["List historical matches", "Show Stokes' best chases", "Open Explorer"]),
    speaker: "Historical · normalised archive",
    method: "rule-engine",
    evidence: [
      {
        id: hit.id,
        label: hit.title,
        detail: `${hit.venue} · ${hit.freshness}`,
        kind: hit.freshness === "DEMO" ? "demo" : "historical",
      },
    ],
    provenanceNote: demoProvenance(),
  };
}

/** Parse "105 off 120 balls with 7 wickets" style chase questions. */
function parseChaseQuery(query: string, raw: string) {
  const offBalls = query.match(/(\d+)\s+off\s+(\d+)\s+balls?/);
  const forPattern = query.match(/required rate for\s+(\d+)\s+off\s+(\d+)/);
  const wickets = query.match(/(\d+)\s+wickets?/);
  const oversLeft = query.match(/(\d+(?:\.\d)?)\s+overs?\s+(?:left|remaining)/);
  let runsRequired = 105;
  let ballsRemaining = 120;
  if (offBalls) {
    runsRequired = Number(offBalls[1]);
    ballsRemaining = Number(offBalls[2]);
  } else if (forPattern) {
    runsRequired = Number(forPattern[1]);
    ballsRemaining = Number(forPattern[2]);
  } else {
    const nums = raw.match(/\d+/g)?.map(Number) ?? [];
    if (nums.length >= 2) {
      runsRequired = nums[0] ?? runsRequired;
      ballsRemaining = nums[1] ?? ballsRemaining;
    }
  }
  if (oversLeft && !offBalls) {
    ballsRemaining = oversToBalls(oversLeft[1] ?? "0");
  }
  const wicketsInHand = wickets ? Number(wickets[1]) : 7;
  return {
    runsRequired,
    ballsRemaining,
    wicketsInHand,
    currentRuns: matchMeta.score.runs,
    ballsFaced: oversToBalls(matchMeta.score.overs),
  };
}

