"use client";

import { useSyncExternalStore } from "react";
import {
  getLiveServerSnapshot,
  getLiveSnapshot,
  subscribeLive,
  type LiveMatchState,
} from "@/lib/live-sim";

export function useLiveMatch(): LiveMatchState {
  return useSyncExternalStore(subscribeLive, getLiveSnapshot, getLiveServerSnapshot);
}
