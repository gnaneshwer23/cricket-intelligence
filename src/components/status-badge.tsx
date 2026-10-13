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
  LIVE: "border-pitch/40 bg-pitch/10 text-pitch",
  COMPLETED: "border-border bg-muted/70 text-muted-foreground",
  UPCOMING: "border-blue/35 bg-blue/8 text-blue",
  DEMO: "border-gold/50 bg-gold/10 text-gold",
};

const freshnessTone: Record<FreshnessStatus, string> = {
  LIVE: "border-pitch/40 bg-pitch/10 text-pitch",
  STALE: "border-gold/40 bg-gold/10 text-gold",
  UNAVAILABLE: "border-border bg-muted/70 text-muted-foreground",
  DEMO: "border-gold/50 bg-gold/10 text-gold",
  HISTORICAL: "border-border text-muted-foreground",
  UPCOMING: "border-blue/35 bg-blue/8 text-blue",
};

const kindTone: Record<DataKind, string> = {
  fact: "border-pitch/35 text-pitch",
  historical: "border-border text-muted-foreground",
  model: "border-blue/35 text-blue",
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
      <span className="text-action tracking-[0.12em] uppercase">Provenance · </span>
      {source} · as of {asOf}
      {note ? ` · ${note}` : null}
    </p>
  );
}
