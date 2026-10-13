"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { initialMood } from "@/lib/data";
import {
  DEFAULT_FOLLOWED_PLAYERS,
  DEFAULT_FOLLOWED_TEAMS,
  defaultSeedAsk,
} from "@/lib/curated-slate";
import { answerQuestion } from "@/lib/engine";
import type {
  AskMode,
  ChatMessage,
  ExplorerFocus,
  HistoricalMatchSummary,
  LabsSeed,
  MoodKey,
  Preferences,
  SavedChat,
  ScreenId,
} from "@/lib/types";

const screens: ScreenId[] = [
  "home",
  "ask",
  "match",
  "explorer",
  "players",
  "feed",
  "teams",
  "community",
  "fantasy",
  "labs",
];

const STORAGE_KEY = "cricketos-mvp-v1";
const STORE_EVENT = "cricketos-store";

type StoredState = {
  onboarded: boolean;
  followedPlayers: string[];
  followedTeams: string[];
  preferences: Preferences;
  recentChats: SavedChat[];
  savedChats: SavedChat[];
};

const defaults: StoredState = {
  onboarded: false,
  followedPlayers: [...DEFAULT_FOLLOWED_PLAYERS],
  followedTeams: [...DEFAULT_FOLLOWED_TEAMS],
  preferences: { englandOnly: false, alerts: true },
  recentChats: [],
  savedChats: [],
};

/** Matches SSR/hydration; real localStorage is applied after subscribe. */
const serverSnapshot: StoredState = { ...defaults, onboarded: true };

let memoryStore: StoredState | null = null;
let clientReady = false;

function parseStore(raw: string | null): StoredState {
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      ...defaults,
      ...parsed,
      preferences: { ...defaults.preferences, ...parsed.preferences },
      followedPlayers: parsed.followedPlayers ?? defaults.followedPlayers,
      followedTeams: parsed.followedTeams ?? defaults.followedTeams,
      recentChats: parsed.recentChats ?? [],
      savedChats: parsed.savedChats ?? [],
    };
  } catch {
    return { ...defaults };
  }
}

function readStore(): StoredState {
  if (!clientReady) return serverSnapshot;
  if (memoryStore) return memoryStore;
  memoryStore = parseStore(window.localStorage.getItem(STORAGE_KEY));
  return memoryStore;
}

function writeStore(next: StoredState) {
  memoryStore = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(STORE_EVENT));
}

function patchStore(patch: Partial<StoredState>) {
  const current = readStore();
  writeStore({
    ...current,
    ...patch,
    preferences: patch.preferences
      ? { ...current.preferences, ...patch.preferences }
      : current.preferences,
  });
}

function subscribeStore(onStoreChange: () => void) {
  const finishHydration = () => {
    if (clientReady) return;
    clientReady = true;
    memoryStore = parseStore(window.localStorage.getItem(STORAGE_KEY));
    onStoreChange();
  };
  const id = window.setTimeout(finishHydration, 0);
  window.addEventListener(STORE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.clearTimeout(id);
    window.removeEventListener(STORE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function hashScreen(): ScreenId {
  const raw = window.location.hash.replace(/^#/, "").split(/[/?]/)[0] ?? "";
  // Cricbuzz-style Live Scores hub — same Match Room surface
  if (raw === "live") return "match";
  const id = raw as ScreenId;
  return screens.includes(id) ? id : "home";
}

type GoOpts = {
  playerId?: string;
  teamId?: string;
  mode?: AskMode;
  seedAsk?: string;
  graphNodeId?: string;
  labsSeed?: LabsSeed;
  explorerFocus?: ExplorerFocus;
};

type AppValue = {
  screen: ScreenId;
  go: (screen: ScreenId, opts?: GoOpts) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  teamId: string;
  setTeamId: (id: string) => void;
  graphNodeId: string | null;
  clearGraphNodeId: () => void;
  labsSeed: LabsSeed | null;
  clearLabsSeed: () => void;
  explorerFocus: ExplorerFocus | null;
  clearExplorerFocus: () => void;
  followedPlayers: string[];
  toggleFollow: (id: string) => void;
  followedTeams: string[];
  toggleFollowTeam: (id: string) => void;
  twinId: string;
  setTwinId: (id: string) => void;
  askMode: AskMode;
  setAskMode: (mode: AskMode) => void;
  messages: ChatMessage[];
  asking: boolean;
  askError: string | null;
  ask: (question: string, mode?: AskMode) => void;
  historicalMatches: HistoricalMatchSummary[];
  setHistoricalMatches: (rows: HistoricalMatchSummary[]) => void;
  mood: typeof initialMood;
  react: (side: "england" | "india", key: MoodKey) => void;
  onboarded: boolean;
  completeOnboarding: (teams: string[], players: string[], seedAsk?: string) => void;
  skipOnboarding: () => void;
  preferences: Preferences;
  setPreferences: (next: Partial<Preferences>) => void;
  recentChats: SavedChat[];
  savedChats: SavedChat[];
  saveChat: (chat: SavedChat) => void;
  pendingSeed: string | null;
  clearPendingSeed: () => void;
};

const AppContext = createContext<AppValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const screen = useSyncExternalStore(subscribeHash, hashScreen, () => "home" as ScreenId);
  const stored = useSyncExternalStore(subscribeStore, readStore, () => serverSnapshot);
  /** Empty = Player Intelligence search-first empty state (not Joe Root by default). */
  const [playerId, setPlayerId] = useState("");
  const [teamId, setTeamId] = useState("india");
  const [twinId, setTwinId] = useState("virat-kohli");
  const [askMode, setAskMode] = useState<AskMode>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [mood, setMood] = useState(initialMood);
  const [pendingSeed, setPendingSeed] = useState<string | null>(null);
  const [graphNodeId, setGraphNodeId] = useState<string | null>(null);
  const [labsSeed, setLabsSeed] = useState<LabsSeed | null>(null);
  const [explorerFocus, setExplorerFocus] = useState<ExplorerFocus | null>(null);
  const [historicalMatches, setHistoricalMatches] = useState<HistoricalMatchSummary[]>([]);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const go = useCallback((next: ScreenId, opts?: GoOpts) => {
    if (opts?.playerId) setPlayerId(opts.playerId);
    if (opts?.teamId) setTeamId(opts.teamId);
    if (opts?.mode) setAskMode(opts.mode);
    if (opts?.seedAsk) setPendingSeed(opts.seedAsk);
    if (opts?.graphNodeId) setGraphNodeId(opts.graphNodeId);
    if (opts?.labsSeed) setLabsSeed(opts.labsSeed);
    if (opts?.explorerFocus) setExplorerFocus(opts.explorerFocus);
    // Prefer location.hash (fires hashchange) over history.replaceState —
    // Next's patched history API can swallow hash-only replaceState updates.
    const target = `#${next}`;
    if (window.location.hash === target) {
      window.dispatchEvent(new Event("hashchange"));
    } else {
      window.location.hash = next;
    }
  }, []);

  const clearPendingSeed = useCallback(() => setPendingSeed(null), []);
  const clearGraphNodeId = useCallback(() => setGraphNodeId(null), []);
  const clearLabsSeed = useCallback(() => setLabsSeed(null), []);
  const clearExplorerFocus = useCallback(() => setExplorerFocus(null), []);

  const ask = useCallback(
    (question: string, mode?: AskMode) => {
      const text = question.trim();
      const used = mode ?? askMode;
      if (!text) {
        setAskError("Ask a question first.");
        return;
      }
      if (asking) return;
      setAskError(null);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text }]);
      setAsking(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        try {
          const answer = answerQuestion(text, used, twinId, {
            historicalMatches,
          });
          setMessages((current) => [
            ...current,
            { id: crypto.randomUUID(), role: "assistant", answer },
          ]);
          const entry: SavedChat = {
            id: crypto.randomUUID(),
            question: text,
            headline: answer.headline,
            at: Date.now(),
          };
          const current = readStore();
          patchStore({
            recentChats: [entry, ...current.recentChats.filter((item) => item.question !== text)].slice(
              0,
              12,
            ),
          });
        } catch {
          setMessages((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              role: "error",
              text: "The model dropped this one. Ask it again.",
            },
          ]);
        } finally {
          setAsking(false);
        }
      }, 680);
    },
    [askMode, asking, twinId, historicalMatches],
  );

  const react = useCallback((side: "england" | "india", key: MoodKey) => {
    setMood((current) => ({
      ...current,
      [side]: { ...current[side], [key]: current[side][key] + 12 },
    }));
  }, []);

  const toggleFollow = useCallback((id: string) => {
    const current = readStore();
    patchStore({
      followedPlayers: current.followedPlayers.includes(id)
        ? current.followedPlayers.filter((item) => item !== id)
        : [...current.followedPlayers, id],
    });
  }, []);

  const toggleFollowTeam = useCallback((id: string) => {
    const current = readStore();
    patchStore({
      followedTeams: current.followedTeams.includes(id)
        ? current.followedTeams.filter((item) => item !== id)
        : [...current.followedTeams, id],
    });
  }, []);

  const completeOnboarding = useCallback((teams: string[], players: string[], seedAsk?: string) => {
    patchStore({
      onboarded: true,
      followedTeams: teams.length ? teams : [...DEFAULT_FOLLOWED_TEAMS],
      followedPlayers: players.length ? players : [...DEFAULT_FOLLOWED_PLAYERS],
    });
    if (players[0]) setPlayerId(players[0]);
    else if (DEFAULT_FOLLOWED_PLAYERS[0]) setPlayerId(DEFAULT_FOLLOWED_PLAYERS[0]);
    if (teams[0]) setTeamId(teams[0]);
    setPendingSeed(seedAsk ?? defaultSeedAsk());
  }, []);

  const skipOnboarding = useCallback(() => {
    patchStore({ onboarded: true });
  }, []);

  const setPreferences = useCallback((next: Partial<Preferences>) => {
    const current = readStore();
    patchStore({ preferences: { ...current.preferences, ...next } });
  }, []);

  const saveChat = useCallback((chat: SavedChat) => {
    const current = readStore();
    if (current.savedChats.some((item) => item.question === chat.question)) return;
    patchStore({ savedChats: [chat, ...current.savedChats].slice(0, 20) });
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      screen,
      go,
      playerId,
      setPlayerId,
      teamId,
      setTeamId,
      graphNodeId,
      clearGraphNodeId,
      labsSeed,
      clearLabsSeed,
      explorerFocus,
      clearExplorerFocus,
      followedPlayers: stored.followedPlayers,
      toggleFollow,
      followedTeams: stored.followedTeams,
      toggleFollowTeam,
      twinId,
      setTwinId,
      askMode,
      setAskMode,
      messages,
      asking,
      askError,
      ask,
      historicalMatches,
      setHistoricalMatches,
      mood,
      react,
      onboarded: stored.onboarded,
      completeOnboarding,
      skipOnboarding,
      preferences: stored.preferences,
      setPreferences,
      recentChats: stored.recentChats,
      savedChats: stored.savedChats,
      saveChat,
      pendingSeed,
      clearPendingSeed,
    }),
    [
      screen,
      go,
      playerId,
      teamId,
      graphNodeId,
      clearGraphNodeId,
      labsSeed,
      clearLabsSeed,
      explorerFocus,
      clearExplorerFocus,
      stored,
      toggleFollow,
      toggleFollowTeam,
      twinId,
      askMode,
      messages,
      asking,
      askError,
      ask,
      historicalMatches,
      mood,
      react,
      completeOnboarding,
      skipOnboarding,
      setPreferences,
      saveChat,
      pendingSeed,
      clearPendingSeed,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside the shell");
  return value;
}
