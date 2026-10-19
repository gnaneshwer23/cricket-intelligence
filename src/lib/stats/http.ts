import type { Pool } from "pg";
import { NextResponse } from "next/server";
import type { CricketFormat, GenderFilter } from "@/lib/domain/models";
import { StatsInputError, type Phase, type StatsFilter } from "@/lib/stats/engine";
import { getStorage } from "@/lib/storage";
import { PostgresStorage } from "@/lib/storage/postgres";

const FORMATS: CricketFormat[] = ["test", "odi", "t20", "other"];
const PHASES: Phase[] = ["powerplay", "middle", "death"];
const GENDERS: GenderFilter[] = ["men", "women"];

function intParam(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw == null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1800 || n > 2100) throw new StatsInputError(`${key} must be a year`);
  return n;
}

function enumParam<T extends string>(params: URLSearchParams, key: string, allowed: T[]): T | undefined {
  const raw = params.get(key);
  if (!raw) return undefined;
  if (!allowed.includes(raw as T)) throw new StatsInputError(`${key} must be one of ${allowed.join(", ")}`);
  return raw as T;
}

export function parseStatsFilter(params: URLSearchParams): StatsFilter {
  return {
    format: enumParam(params, "format", FORMATS),
    phase: enumParam(params, "phase", PHASES),
    gender: enumParam(params, "gender", GENDERS),
    yearFrom: intParam(params, "yearFrom"),
    yearTo: intParam(params, "yearTo"),
    competition: params.get("competition")?.slice(0, 100) || undefined,
  };
}

/** Stats need ball-level rows in durable storage; refuse honestly otherwise. */
export function statsPool(): Pool | null {
  const storage = getStorage();
  return storage instanceof PostgresStorage ? storage.pool : null;
}

export function statsUnavailable() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Stats engine needs Postgres with ingested deliveries (CRICKETOS_STORAGE_BACKEND=postgres + DATABASE_URL + npm run ingest:cricsheet).",
    },
    { status: 503 },
  );
}

export function statsError(err: unknown) {
  if (err instanceof StatsInputError) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
  console.error("[stats]", err);
  return NextResponse.json({ ok: false, error: "stats query failed" }, { status: 500 });
}
