"use client";

import { StatusBadge, FreshnessBadge, KindBadge } from "@/components/status-badge";

/** Always-on watermark for the quarantined Lord’s DEMO playground. */
export function DemoPlaygroundBanner({ note }: { note?: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-gold/35 bg-gold/10 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status="DEMO" />
        <FreshnessBadge freshness="DEMO" />
        <KindBadge kind="demo" />
        <span className="text-[11px] tracking-[0.16em] text-gold uppercase">
          DEMO playground
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {note ??
          "Scripted England vs India at Lord’s — illustrative only. Not a live score, official record, or provider feed."}
      </p>
    </div>
  );
}
