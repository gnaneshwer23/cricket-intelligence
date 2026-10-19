"use client";

import { useEffect } from "react";
import { Activity, House, Library, Newspaper, Sparkles, UserRound } from "lucide-react";
import { AppStateProvider, openAssistant, useApp } from "@/components/app-state";
import { AssistantWidget } from "@/components/assistant-widget";
import { Onboarding } from "@/components/onboarding";
import { ArchiveScreen } from "@/components/screens/archive";
import { FeedScreen } from "@/components/screens/feed";
import { HomeScreen } from "@/components/screens/home";
import { LiveScreen } from "@/components/screens/live";
import { PlayersScreen } from "@/components/screens/players";
import type { ScreenId } from "@/lib/types";

const nav: { id: ScreenId; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "match", label: "Live", icon: Activity },
  { id: "players", label: "Players", icon: UserRound },
  { id: "archive", label: "Archive", icon: Library },
  { id: "feed", label: "My Cricket", icon: Newspaper },
];

const titles: Partial<Record<ScreenId, string>> = {
  home: "Home",
  match: "Live scores",
  archive: "Archive",
  players: "Players",
  feed: "My Cricket",
  teams: "Teams",
};

function Brand() {
  return (
    <span className="font-display text-[1.15rem] tracking-tight text-navy">
      <span className="font-light">Cricket</span> <span className="font-semibold">Intelligence</span>
    </span>
  );
}

function Shell() {
  const { screen, go, onboarded } = useApp();
  const active: ScreenId = screen === "teams" ? "players" : screen;

  useEffect(() => {
    document.title = `${titles[screen] ?? "Home"} · Cricket Intelligence`;
  }, [screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (event.key === "/") {
        event.preventDefault();
        openAssistant();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="min-h-dvh" inert={!onboarded ? true : undefined} aria-hidden={!onboarded ? true : undefined}>
        {/* Floating glass navigation */}
        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
          <div className="glass-strong mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full py-2 pr-2 pl-5">
            <button type="button" onClick={() => go("home")} className="shrink-0" aria-label="Cricket Intelligence home">
              <Brand />
            </button>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
              {nav.map((item) => {
                const on = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={on ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      on ? "bg-navy text-white shadow-sm" : "text-slate hover:bg-white/80 hover:text-navy"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={() => openAssistant()}
              className="flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 text-sm font-medium text-white shadow-[0_10px_24px_-12px_var(--cos-blue)] transition hover:bg-cobalt/90"
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </div>
        </header>

        <main id="content" className="mx-auto max-w-6xl px-4 pt-6 pb-32 sm:px-6 lg:pt-10 lg:pb-20">
          {screen === "home" ? <HomeScreen /> : null}
          {screen === "match" ? <LiveScreen /> : null}
          {screen === "archive" ? <ArchiveScreen /> : null}
          {screen === "players" || screen === "teams" ? <PlayersScreen /> : null}
          {screen === "feed" ? <FeedScreen /> : null}
        </main>

        {/* Mobile tab bar */}
        <nav
          className="glass-strong fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-[1.4rem] px-1.5 py-1.5 md:hidden"
          aria-label="Primary"
        >
          {nav.map((item) => {
            const Icon = item.icon;
            const on = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                aria-current={on ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] transition ${
                  on ? "bg-navy text-white" : "text-slate"
                }`}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {onboarded ? <AssistantWidget /> : null}
      </div>

      <Onboarding />
    </div>
  );
}

export function CricketIntelligenceApp() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
