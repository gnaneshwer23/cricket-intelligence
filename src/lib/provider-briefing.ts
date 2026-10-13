/**
 * Briefing items derived only from real provider fixtures — never authored fiction.
 */

import type { FixtureRow } from "@/hooks/use-data-layer";
import type { ScreenId } from "@/lib/types";

export type ProviderBriefingItem = {
  id: string;
  icon: string;
  title: string;
  detail: string;
  screen: ScreenId;
  playerId?: string;
  teamIds?: string[];
};

function sideLabel(f: FixtureRow): string {
  if (f.homeName && f.awayName) return `${f.homeName} vs ${f.awayName}`;
  return f.title.replace(/ \(DEMO\)$/, "");
}

/** Build briefing bullets from provider fixture rows only. */
export function buildProviderBriefing(fixtures: FixtureRow[]): ProviderBriefingItem[] {
  const items: ProviderBriefingItem[] = [];
  const live = fixtures.filter((f) => f.status === "LIVE" && f.freshness === "LIVE");
  const upcoming = fixtures.filter(
    (f) => f.status === "UPCOMING" || f.freshness === "UPCOMING",
  );
  const recent = fixtures.filter(
    (f) => f.status === "COMPLETED" || f.freshness === "HISTORICAL",
  );

  if (live.length > 0) {
    items.push({
      id: "provider-live-count",
      icon: "●",
      title: `${live.length} match${live.length === 1 ? "" : "es"} live`,
      detail: live
        .slice(0, 3)
        .map((f) => {
          const score = f.score ? ` · ${f.score.runs}/${f.score.wickets}` : "";
          return `${sideLabel(f)}${score}`;
        })
        .join(" · "),
      screen: "match",
    });
  }

  const next = upcoming[0];
  if (next) {
    items.push({
      id: "provider-next",
      icon: "→",
      title: `Next: ${sideLabel(next)}`,
      detail: [next.venue, next.series, next.format, next.startTimeIso?.slice(0, 16)]
        .filter(Boolean)
        .join(" · "),
      screen: "match",
    });
  }

  if (recent.length > 0 && items.length < 3) {
    const r = recent[0];
    items.push({
      id: "provider-recent",
      icon: "✓",
      title: `Recent: ${sideLabel(r)}`,
      detail: [
        r.venue,
        r.score ? `${r.score.runs}/${r.score.wickets}` : null,
        r.statusLine,
        r.provenance?.asOf ? `as of ${r.provenance.asOf.slice(0, 19)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      screen: "match",
    });
  }

  if (fixtures.length > 0 && items.length === 0) {
    items.push({
      id: "provider-synced",
      icon: "◎",
      title: `${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"} from provider`,
      detail: "Open Live Scores for series, venue, and status from the licensed feed.",
      screen: "match",
    });
  }

  return items;
}
