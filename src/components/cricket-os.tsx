"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ChartColumn,
  FlaskConical,
  House,
  Library,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { AppStateProvider, useApp } from "@/components/app-state";
import { MatchFocusStrip } from "@/components/match-focus-strip";
import { AssistantWidget } from "@/components/assistant-widget";
import { Onboarding } from "@/components/onboarding";
import { ArchiveScreen } from "@/components/screens/archive";
import { AskScreen } from "@/components/screens/ask";
import { CommunityScreen } from "@/components/screens/community";
import { ExplorerScreen } from "@/components/screens/explorer";
import { FantasyScreen } from "@/components/screens/fantasy";
import { FeedScreen } from "@/components/screens/feed";
import { HomeScreen } from "@/components/screens/home";
import { LabsScreen } from "@/components/screens/labs";
import { MatchScreen } from "@/components/screens/match";
import { PlayersScreen } from "@/components/screens/players";
import { TeamsScreen } from "@/components/screens/teams";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ScreenId } from "@/lib/types";

const primaryNav: { id: ScreenId; label: string; short: string; icon: typeof House }[] = [
  { id: "home", label: "Cricket Today", short: "Today", icon: House },
  { id: "match", label: "Match Intelligence", short: "Match", icon: Activity },
  { id: "archive", label: "Historical Archive", short: "Archive", icon: Library },
  { id: "ask", label: "Ask Cricket Intelligence", short: "Ask", icon: MessageCircle },
];

const laterNav: { id: ScreenId; label: string; icon: typeof House; note: string }[] = [
  { id: "players", label: "Players & Teams", icon: UserRound, note: "Search-first profiles" },
  { id: "labs", label: "Labs", icon: FlaskConical, note: "What-If · transparent assumptions" },
  { id: "explorer", label: "Explorer", icon: ChartColumn, note: "Charts · DEMO series" },
  { id: "feed", label: "My Cricket", icon: Newspaper, note: "Personal feed" },
  { id: "teams", label: "Team Intel", icon: Users, note: "DNA & squad health" },
  { id: "community", label: "Community", icon: MessagesSquare, note: "Secondary" },
  { id: "fantasy", label: "Fantasy", icon: Target, note: "Experimental" },
];

const titles: Record<ScreenId, string> = {
  home: "Cricket Today",
  ask: "Ask Cricket Intelligence",
  match: "Match Intelligence",
  archive: "Historical Archive",
  explorer: "Cricket Explorer",
  players: "Players & Teams",
  feed: "My Cricket",
  teams: "Team Intelligence",
  community: "Community",
  fantasy: "Fantasy",
  labs: "Labs · What-If",
};

function Shell() {
  const { screen, go, onboarded } = useApp();
  const [more, setMore] = useState(false);

  useEffect(() => {
    document.title = `${titles[screen]} · Cricket Intelligence`;
  }, [screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (event.key === "/") {
        event.preventDefault();
        go("ask");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div
        className="min-h-dvh"
        inert={!onboarded ? true : undefined}
        aria-hidden={!onboarded ? true : undefined}
      >
      <aside className="cos-rail fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-6 lg:flex">
        <div className="px-2">
          <p className="font-display text-[1.65rem] font-semibold leading-none text-navy">
            Cricket Intelligence
          </p>
          <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/70">
            Understand every match. Explore the evidence. Ask cricket anything.
          </p>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-0.5" aria-label="Primary">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                variant={active ? "default" : "ghost"}
                className={`h-10 justify-start px-3 ${
                  active
                    ? "cos-cta bg-action text-primary-foreground shadow-[0_6px_16px_-8px_var(--cos-action)] hover:bg-action/90"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => go(item.id)}
              >
                <Icon />
                {item.label}
              </Button>
            );
          })}
          <p className="mt-6 px-3 text-[10px] tracking-[0.2em] text-sidebar-foreground/50 uppercase">
            Labs & more
          </p>
          {laterNav.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                className={`h-9 justify-start px-3 ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-[inset_2px_0_0_0_var(--cos-blue)]"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => go(item.id)}
              >
                <Icon />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </nav>
        <p className="px-2 text-[11px] leading-relaxed text-sidebar-foreground/55">
          The match is the centre
          <span className="mt-1.5 block text-sidebar-foreground/40">
            Every number has a source — no invented scores. Tap Ask AI to chat or speak.
          </span>
        </p>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-canvas/85 px-4 py-3.5 backdrop-blur-xl lg:hidden">
          <div>
            <p className="font-display text-xl font-semibold text-navy">Cricket Intelligence</p>
            <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              Evidence-first cricket
            </p>
          </div>
          <p className="text-[10px] tracking-[0.14em] text-action uppercase">Match centre</p>
        </header>
        <main id="content" className="px-4 pt-6 pb-28 lg:px-10 lg:pt-10 lg:pb-20">
          <MatchFocusStrip />
          {screen === "home" ? <HomeScreen /> : null}
          {screen === "ask" ? <AskScreen /> : null}
          {screen === "match" ? <MatchScreen /> : null}
          {screen === "archive" ? <ArchiveScreen /> : null}
          {screen === "explorer" ? <ExplorerScreen /> : null}
          {screen === "players" ? <PlayersScreen /> : null}
          {screen === "feed" ? <FeedScreen /> : null}
          {screen === "teams" ? <TeamsScreen /> : null}
          {screen === "community" ? <CommunityScreen /> : null}
          {screen === "fantasy" ? <FantasyScreen /> : null}
          {screen === "labs" ? <LabsScreen /> : null}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-canvas/92 px-1.5 py-2 backdrop-blur-xl lg:hidden"
        aria-label="Primary"
      >
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] transition ${
                active
                  ? "text-action"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => go(item.id)}
            >
              <Icon className="size-4" />
              {item.short}
            </button>
          );
        })}
        <button
          type="button"
          className={`flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] transition ${
            laterNav.some((item) => item.id === screen)
              ? "text-action"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMore(true)}
        >
          <span className="text-base leading-none">+</span>
          More
        </button>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription>
              Labs, Explorer, feed, and secondary rooms. Paths back to Match Intelligence stay
              available via the match focus chip.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4 pb-6">
            {laterNav.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant={screen === item.id ? "default" : "secondary"}
                  className="h-11 justify-start"
                  onClick={() => {
                    setMore(false);
                    go(item.id);
                  }}
                >
                  <Icon />
                  <span className="flex flex-col items-start">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">{item.note}</span>
                  </span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
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
