"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  FlaskConical,
  House,
  MessageCircle,
  MessagesSquare,
  Target,
  UserRound,
  Users,
} from "lucide-react";
import { AppStateProvider, useApp } from "@/components/app-state";
import { AskScreen } from "@/components/screens/ask";
import { CommunityScreen } from "@/components/screens/community";
import { FantasyScreen } from "@/components/screens/fantasy";
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

const nav: { id: ScreenId; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "ask", label: "Ask Cricket", icon: MessageCircle },
  { id: "match", label: "Live Match", icon: Activity },
  { id: "players", label: "Players", icon: UserRound },
  { id: "teams", label: "Teams", icon: Users },
  { id: "community", label: "Community", icon: MessagesSquare },
  { id: "fantasy", label: "Fantasy", icon: Target },
  { id: "labs", label: "Labs", icon: FlaskConical },
];

const titles: Record<ScreenId, string> = {
  home: "Home",
  ask: "Ask Cricket",
  match: "Live Match",
  players: "Players",
  teams: "Teams",
  community: "Community",
  fantasy: "Fantasy",
  labs: "Labs",
};

function Shell() {
  const { screen, go } = useApp();
  const [more, setMore] = useState(false);

  useEffect(() => {
    document.title = `${titles[screen]} · CricketOS`;
  }, [screen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
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
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar/95 px-3 py-5 lg:flex">
        <div className="px-2">
          <p className="font-display text-2xl tracking-tight">CricketOS</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Don’t search cricket. Ask cricket.
          </p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Primary">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <Button
                key={item.id}
                type="button"
                variant={active ? "default" : "ghost"}
                className="h-10 justify-start px-3"
                aria-current={active ? "page" : undefined}
                onClick={() => go(item.id)}
              >
                <Icon />
                {item.label}
                {item.id === "match" ? (
                  <span className="ml-auto size-1.5 rounded-full bg-current" aria-hidden />
                ) : null}
              </Button>
            );
          })}
        </nav>
        <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
          Member · James
          <span className="mt-1 block">Illustrative model. Not an official score or a betting slip.</span>
        </p>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <p className="font-display text-xl">CricketOS</p>
          <p className="text-xs text-muted-foreground">Lord’s · Day 2</p>
        </header>
        <main id="content" className="px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-16">
          {screen === "home" ? <HomeScreen /> : null}
          {screen === "ask" ? <AskScreen /> : null}
          {screen === "match" ? <MatchScreen /> : null}
          {screen === "players" ? <PlayersScreen /> : null}
          {screen === "teams" ? <TeamsScreen /> : null}
          {screen === "community" ? <CommunityScreen /> : null}
          {screen === "fantasy" ? <FantasyScreen /> : null}
          {screen === "labs" ? <LabsScreen /> : null}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-1 py-2 backdrop-blur lg:hidden" aria-label="Primary">
        {nav.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = screen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex flex-col items-center gap-1 rounded-xl py-1 text-[10px] ${active ? "text-lime" : "text-muted-foreground"}`}
              onClick={() => go(item.id)}
            >
              <Icon className="size-4" />
              {item.label === "Ask Cricket" ? "Ask" : item.label === "Live Match" ? "Live" : item.label}
            </button>
          );
        })}
        <button type="button" className="flex flex-col items-center gap-1 py-1 text-[10px] text-muted-foreground" onClick={() => setMore(true)}>
          <span className="text-base leading-none">+</span>
          More
        </button>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>The rest of the ground</SheetTitle>
            <SheetDescription>Teams, the room, fantasy, and the lab.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-2 px-4 pb-6">
            {nav.slice(4).map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="secondary"
                  className="h-11 justify-start"
                  onClick={() => {
                    setMore(false);
                    go(item.id);
                  }}
                >
                  <Icon />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CricketOS() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  );
}
