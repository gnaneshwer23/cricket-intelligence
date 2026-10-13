"use client";

import { useApp } from "@/components/app-state";
import { FreshnessBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import type { FreshnessStatus, MatchLifecycle } from "@/lib/contracts";

/**
 * Persistent match context chip — shown on non-match screens so the user
 * can return to Match Intelligence without losing the selected match.
 */
export function MatchFocusStrip() {
  const { matchFocus, screen, go, clearMatchFocus } = useApp();
  if (!matchFocus) return null;
  if (screen === "match") return null;

  const status = matchFocus.status as MatchLifecycle;
  const freshness = matchFocus.freshness as FreshnessStatus;
  const score = matchFocus.score
    ? `${matchFocus.score.runs}/${matchFocus.score.wickets}${
        matchFocus.score.overs ? ` (${matchFocus.score.overs})` : ""
      }`
    : null;

  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2.5 shadow-[0_1px_0_color-mix(in_oklab,var(--cos-navy)_4%,transparent)]"
      role="status"
      aria-label="Active match context"
    >
      <span className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        Match focus
      </span>
      <StatusBadge status={status === "COMPLETED" ? "COMPLETED" : status} />
      <FreshnessBadge freshness={freshness} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">
        {matchFocus.title}
      </span>
      {score ? (
        <span className="font-mono text-xs text-blue tabular-nums">{score}</span>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7"
        onClick={() => go("match")}
      >
        Return
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 text-muted-foreground"
        onClick={() => clearMatchFocus()}
      >
        Clear
      </Button>
    </div>
  );
}
