import { getCricketOsConfig, getDatabaseUrl } from "@/lib/provider/config";
import { createStorage } from "@/lib/storage/postgres";
import type { CricketStorage } from "@/lib/storage/types";

let singleton: CricketStorage | null = null;

/** Process-wide storage. Memory by default; never claims durable without Postgres. */
export function getStorage(): CricketStorage {
  if (!singleton) {
    const cfg = getCricketOsConfig();
    singleton = createStorage(cfg.storageBackend, getDatabaseUrl());
  }
  return singleton;
}

/** Test-only reset */
export function resetStorageForTests(storage?: CricketStorage): void {
  singleton = storage ?? null;
}

export type { CricketStorage } from "@/lib/storage/types";
