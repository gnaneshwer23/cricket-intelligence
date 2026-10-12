import type { MoodKey } from "@/lib/types";

export const MOODS: { key: MoodKey; emoji: string; label: string }[] = [
  { key: "fire", emoji: "🔥", label: "Fired up" },
  { key: "clap", emoji: "👏", label: "Applaud" },
  { key: "shock", emoji: "😱", label: "Shock" },
  { key: "cry", emoji: "😭", label: "Gutted" },
  { key: "rage", emoji: "😡", label: "Furious" },
  { key: "mind", emoji: "🤯", label: "Mind blown" },
];

export function toPercents(counts: number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0) || 1;
  const raw = counts.map((n) => (n / total) * 100);
  const floors = raw.map((n) => Math.floor(n));
  let left = 100 - floors.reduce((sum, n) => sum + n, 0);
  const order = raw
    .map((n, index) => ({ index, fraction: n - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let i = 0; i < order.length && left > 0; i += 1) {
    floors[order[i].index] += 1;
    left -= 1;
  }
  return floors;
}

export function moodBreakdown(counts: Record<MoodKey, number>) {
  const percents = toPercents(MOODS.map((mood) => counts[mood.key]));
  return MOODS.map((mood, index) => ({
    ...mood,
    count: counts[mood.key],
    pct: percents[index],
  })).sort((a, b) => b.pct - a.pct);
}

export function hasWord(query: string, word: string) {
  return new RegExp(`\\b${word}\\b`, "i").test(query);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
