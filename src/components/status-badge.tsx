import {
  freshnessLabel,
  kindLabel,
  statusLabel,
  type DataKind,
  type FreshnessStatus,
  type MatchLifecycle,
} from "@/lib/contracts";
import { cn } from "cn";

const statusTone: Record<MatchLifecycle, string> = {
  LIVE: "border-lime/50 bg-lime/15 text-lime",
  COMPLETED: "border-border bg-muted/60 text-muted-foreground",
  UPCOMING: "border-eng/40 bg-eng/10 text-eng",
  DEMO: "border-gold/50 bg-gold/10 text-gold",
};

const freshnessTone: Record<FreshnessStatus, string> = {
  LIVE: "border-lime/50 bg-lime/15 text-lime",
  STALE: "border-gold/40 bg-gold/10 text-gold",
  UNAVAILABLE: "border-border bg-muted/60 text-muted-foreground",
  DEMO: "border-gold/50 bg-gold/10 text-gold",
  HISTORICAL: "border-border text-muted-foreground",
  UPCOMING: "border-eng/40 bg-eng/10 text-eng",
};

const kindTone: Record<DataKind, string> = {
  fact: "border-lime/40 text-lime",
  historical: "border-border text-muted-foreground",
  model: "border-eng/40 text-eng",
  hypothetical: "border-gold/40 text-gold",
  demo: "border-gold/50 text-gold",
};

export function StatusBadge({
  status,
  className,
}: {
  status: MatchLifecycle;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] uppercase",
        statusTone[status],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

export function FreshnessBadge({
  freshness,
  className,
}: {
  freshness: FreshnessStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-[0.14em] uppercase",
        freshnessTone[freshness],
        className,
      )}
    >
      {freshnessLabel(freshness)}
    </span>
  );
}

export function KindBadge({ kind, className }: { kind: DataKind; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] uppercase",
        kindTone[kind],
        className,
      )}
    >
      {kindLabel(kind)}
    </span>
  );
}

export function ProvenanceStrip({
  source,
  asOf,
  note,
}: {
  source: string;
  asOf: string;
  note?: string;
}) {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground" role="note">
      <span className="text-gold tracking-[0.12em] uppercase">Provenance · </span>
      {source} · as of {asOf}
      {note ? ` · ${note}` : null}
    </p>
  );
}
