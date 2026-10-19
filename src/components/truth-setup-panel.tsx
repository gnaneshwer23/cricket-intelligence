"use client";

import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui-bits";
import { SETUP_HEADLINE, SETUP_STEPS, openDemoPlayground } from "@/lib/truth-mode";

type Props = {
  /** Compact home / board empty state */
  compact?: boolean;
  showDemoLink?: boolean;
  className?: string;
};

export function TruthSetupPanel({
  compact = false,
  showDemoLink = true,
  className = "",
}: Props) {
  return (
    <div
      className={`rounded-[1.75rem] border border-border bg-card/80 ${compact ? "p-5 sm:p-6" : "p-6 sm:p-8"} ${className}`}
    >
      <Kicker className="text-action">Truth mode · no provider key</Kicker>
      <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-navy text-balance sm:text-3xl">
        {SETUP_HEADLINE}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Cricket Intelligence will not invent match scores, player stats, win probabilities, or AI briefings.
        Add a licensed CricAPI key to show real fixtures and scores.
      </p>
      <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        {SETUP_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          className="cos-cta"
          onClick={() => {
            window.open("https://cricketdata.org/", "_blank", "noopener,noreferrer");
          }}
        >
          Get CricAPI key
        </Button>
        {showDemoLink ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-action"
            onClick={() => openDemoPlayground()}
          >
            Try DEMO playground
          </Button>
        ) : null}
      </div>
      <p className="mt-4 text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        DEMO playground is labelled · never the default product surface
      </p>
    </div>
  );
}
