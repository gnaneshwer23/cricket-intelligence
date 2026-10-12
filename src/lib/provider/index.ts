import { getCricketOsConfig } from "@/lib/provider/config";
import { CricApiAdapter } from "@/lib/provider/cricapi-adapter";
import { DemoAdapter } from "@/lib/provider/demo-adapter";
import { SportmonksAdapter } from "@/lib/provider/sportmonks-adapter";
import type { CricketDataAdapter } from "@/lib/provider/types";

/** Resolve adapter from config — demo when no usable credentials. */
export function createDataAdapter(): CricketDataAdapter {
  const cfg = getCricketOsConfig();
  if (cfg.demoMode || cfg.dataProvider === "demo") return new DemoAdapter();
  if (cfg.dataProvider === "sportmonks") return new SportmonksAdapter();
  if (cfg.dataProvider === "cricapi") return new CricApiAdapter();
  return new DemoAdapter();
}

let cached: CricketDataAdapter | null = null;

export function getDataAdapter(): CricketDataAdapter {
  if (!cached) cached = createDataAdapter();
  return cached;
}

/** Test helper */
export function resetDataAdapterForTests(adapter?: CricketDataAdapter): void {
  cached = adapter ?? null;
}

export type { CricketDataAdapter } from "@/lib/provider/types";
export { DemoAdapter } from "@/lib/provider/demo-adapter";
export { CricApiAdapter } from "@/lib/provider/cricapi-adapter";
export { SportmonksAdapter } from "@/lib/provider/sportmonks-adapter";
