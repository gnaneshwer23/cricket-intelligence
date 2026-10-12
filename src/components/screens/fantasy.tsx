"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Kicker, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiXi, captains, injuries, pottsPick } from "@/lib/data";

const slots = [
  { x: "32%", y: "12%" },
  { x: "68%", y: "12%" },
  { x: "50%", y: "26%" },
  { x: "28%", y: "38%" },
  { x: "72%", y: "38%" },
  { x: "50%", y: "50%" },
  { x: "50%", y: "62%" },
  { x: "30%", y: "74%" },
  { x: "70%", y: "74%" },
  { x: "38%", y: "88%" },
  { x: "62%", y: "88%" },
];

export function FantasyScreen() {
  const { go } = useApp();
  const [xi, setXi] = useState(aiXi);
  const [captainId, setCaptainId] = useState("joe-root");
  const [selected, setSelected] = useState(aiXi[3].id);
  const [withPotts, setWithPotts] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const captain = captains.find((item) => item.id === captainId) ?? captains[0];
  const focus = xi.find((item) => item.id === selected) ?? xi[0];

  function togglePotts() {
    setWithPotts((current) => {
      const next = !current;
      setXi((players) =>
        players.map((player) =>
          player.id === "shoib-bashir" || player.id === pottsPick.id
            ? next
              ? { ...pottsPick, reason: pottsPick.reason }
              : aiXi[10]
            : player,
        ),
      );
      setSelected(next ? pottsPick.id : "shoib-bashir");
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Fantasy copilot"
        title="Intelligence, not a ticket."
        lede="An XI with a reason for every name, a captain with a confidence number, and the injuries that should change your mind."
      />
      <Tabs defaultValue="xi">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="xi">AI selection</TabsTrigger>
          <TabsTrigger value="captain">Captain advisor</TabsTrigger>
          <TabsTrigger value="injury">Injury alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="xi" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <Panel>
              <div className="relative mx-auto aspect-[3/4] max-w-md rounded-[50%] border border-lime/30 bg-[radial-gradient(circle_at_50%_40%,oklch(0.38_0.07_145),oklch(0.24_0.04_145))]">
                <div className="absolute top-1/2 left-1/2 h-16 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-[oklch(0.62_0.08_110)]" />
                {xi.map((player, index) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => setSelected(player.id)}
                    className={`absolute w-16 -translate-x-1/2 -translate-y-1/2 rounded-full px-1 py-1 text-center text-[10px] leading-tight sm:w-20 ${
                      selected === player.id ? "bg-primary text-primary-foreground" : "bg-background/80"
                    }`}
                    style={{ left: slots[index].x, top: slots[index].y }}
                  >
                    {player.name}
                    {player.id === captainId ? " · C" : ""}
                  </button>
                ))}
              </div>
            </Panel>
            <div className="space-y-4">
              <Panel>
                <Kicker>{focus.role}</Kicker>
                <h3 className="mt-2 text-lg font-medium">{focus.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{focus.reason}</p>
              </Panel>
              <Panel>
                <Kicker>Best differential</Kicker>
                <p className="mt-2 font-medium">Matthew Potts</p>
                <p className="text-sm text-muted-foreground">Ownership {pottsPick.ownership}</p>
                <p className="text-sm text-muted-foreground">Expected return {pottsPick.points} points</p>
                <Button type="button" className="mt-4" variant={withPotts ? "secondary" : "default"} onClick={togglePotts}>
                  {withPotts ? "Return Bashir" : "Add Potts"}
                </Button>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="captain" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <Panel>
              <Kicker>Captain recommendation</Kicker>
              <h3 className="font-display mt-3 text-4xl">{captain.name}</h3>
              <p className="text-lime mt-2 font-mono text-5xl tabular-nums">{captain.confidence}%</p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{captain.note}</p>
              <Button type="button" className="mt-5" onClick={() => go("players", { playerId: captain.id })}>
                Open the file
              </Button>
            </Panel>
            <div className="grid gap-2">
              {captains.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCaptainId(item.id)}
                  className={`rounded-3xl border px-4 py-4 text-left ${
                    item.id === captainId ? "border-lime bg-card" : "border-border"
                  }`}
                >
                  <span className="flex items-baseline justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span className="tabular-nums">{item.confidence}%</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="injury" className="mt-4">
          <div className="grid gap-3">
            {injuries.map((item) => (
              <Panel key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{item.player}</h3>
                    <p className="text-sm text-muted-foreground">{item.issue}</p>
                  </div>
                  <span className={`text-xs ${item.severity === "High" ? "text-destructive" : "text-gold"}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{item.impact}</p>
              </Panel>
            ))}
          </div>
          <Panel className="mt-4">
            <Kicker>Apply the alerts</Kicker>
            <p className="mt-2 text-sm text-muted-foreground">
              Woakes is already out of the XI. Applying the alert locks that and keeps Bumrah on a spell cap.
            </p>
            <Button type="button" className="mt-4" variant={alertsOn ? "secondary" : "default"} onClick={() => setAlertsOn(true)} disabled={alertsOn}>
              {alertsOn ? "Alerts folded in" : "Apply alerts"}
            </Button>
            {alertsOn ? (
              <p className="mt-3 text-sm text-lime" role="status">
                Woakes stays out. Bumrah remains a must-start with the spell capped. Stokes bowls four overs, not twelve.
              </p>
            ) : null}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
