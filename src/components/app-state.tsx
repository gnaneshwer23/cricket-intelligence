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
import { answerQuestion } from "@/lib/engine";
import type { AskMode, ChatMessage, MoodKey, ScreenId } from "@/lib/types";

const screens: ScreenId[] = [
  "home",
  "ask",
  "match",
  "players",
  "teams",
  "community",
  "fantasy",
  "labs",
];

function subscribeHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function hashScreen(): ScreenId {
  const id = window.location.hash.replace("#", "") as ScreenId;
  return screens.includes(id) ? id : "home";
}

type AppValue = {
  screen: ScreenId;
  go: (
    screen: ScreenId,
    opts?: { playerId?: string; teamId?: string; mode?: AskMode },
  ) => void;
  playerId: string;
  setPlayerId: (id: string) => void;
  teamId: string;
  setTeamId: (id: string) => void;
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
  mood: typeof initialMood;
  react: (side: "england" | "india", key: MoodKey) => void;
};

const AppContext = createContext<AppValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const screen = useSyncExternalStore(subscribeHash, hashScreen, () => "home" as ScreenId);
  const [playerId, setPlayerId] = useState("joe-root");
  const [teamId, setTeamId] = useState("england");
  const [followedPlayers, setFollowedPlayers] = useState([
    "joe-root",
    "harry-brook",
    "jasprit-bumrah",
    "virat-kohli",
  ]);
  const [followedTeams, setFollowedTeams] = useState(["england", "india"]);
  const [twinId, setTwinId] = useState("virat-kohli");
  const [askMode, setAskMode] = useState<AskMode>("general");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [mood, setMood] = useState(initialMood);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const go = useCallback(
    (next: ScreenId, opts?: { playerId?: string; teamId?: string; mode?: AskMode }) => {
      if (opts?.playerId) setPlayerId(opts.playerId);
      if (opts?.teamId) setTeamId(opts.teamId);
      if (opts?.mode) setAskMode(opts.mode);
      const url = `${window.location.pathname}${window.location.search}#${next}`;
      window.history.replaceState(null, "", url);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    },
    [],
  );

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
          const answer = answerQuestion(text, used, twinId);
          setMessages((current) => [
            ...current,
            { id: crypto.randomUUID(), role: "assistant", answer },
          ]);
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
    [askMode, asking, twinId],
  );

  const react = useCallback((side: "england" | "india", key: MoodKey) => {
    setMood((current) => ({
      ...current,
      [side]: { ...current[side], [key]: current[side][key] + 12 },
    }));
  }, []);

  const toggleFollow = useCallback((id: string) => {
    setFollowedPlayers((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const toggleFollowTeam = useCallback((id: string) => {
    setFollowedTeams((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      screen,
      go,
      playerId,
      setPlayerId,
      teamId,
      setTeamId,
      followedPlayers,
      toggleFollow,
      followedTeams,
      toggleFollowTeam,
      twinId,
      setTwinId,
      askMode,
      setAskMode,
      messages,
      asking,
      askError,
      ask,
      mood,
      react,
    }),
    [
      screen,
      go,
      playerId,
      teamId,
      followedPlayers,
      toggleFollow,
      followedTeams,
      toggleFollowTeam,
      twinId,
      askMode,
      messages,
      asking,
      askError,
      ask,
      mood,
      react,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside the shell");
  return value;
}
