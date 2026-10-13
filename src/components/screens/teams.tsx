"use client";

import { useApp } from "@/components/app-state";
import { Kicker, Meter, PageTitle, Panel } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlayer, teams } from "@/lib/data";

export function TeamsScreen() {
  const { teamId, setTeamId, followedTeams, toggleFollowTeam, go } = useApp();
  const team = teams.find((item) => item.id === teamId) ?? teams[0];
  const followed = followedTeams.includes(team.id);
  const maxTempo = Math.max(...team.evolution.map((item) => item.tempo));

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        kicker="Teams"
        title="Team DNA."
        lede="How a side plays, how that changed, who is actually fit, and the XI the model thinks they become."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {teams.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={item.id === team.id ? "default" : "secondary"}
            onClick={() => setTeamId(item.id)}
          >
            {item.name}
          </Button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl">{team.name}</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{team.summary}</p>
        </div>
        <Button type="button" variant={followed ? "secondary" : "default"} onClick={() => toggleFollowTeam(team.id)}>
          {followed ? "Following" : "Follow"}
        </Button>
      </div>

      <Tabs defaultValue="dna">
        <TabsList variant="line" className="h-auto! w-full justify-start overflow-x-auto">
          <TabsTrigger value="dna">Team DNA</TabsTrigger>
          <TabsTrigger value="evolution">Evolution</TabsTrigger>
          <TabsTrigger value="health">Squad health</TabsTrigger>
          <TabsTrigger value="future">Future squad</TabsTrigger>
        </TabsList>

        <TabsContent value="dna" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Panel className="lg:col-span-3">
              <div className="space-y-4">
                {team.dna.map((item) => (
                  <Meter key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </Panel>
            <div className="space-y-4 lg:col-span-2">
              <Panel>
                <Kicker>Style</Kicker>
                <ul className="mt-3 space-y-2">
                  {team.styles.map((style) => (
                    <li key={style} className="rounded-2xl bg-muted/60 px-3 py-2 text-sm">
                      {style}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel>
                <Kicker>Historical match</Kicker>
                <p className="font-display mt-3 text-2xl">{team.analogue.title}</p>
                <p className="text-lime mt-1 text-sm tabular-nums">Similarity {team.analogue.similarity}%</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{team.analogue.note}</p>
              </Panel>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="mt-4">
          <Panel>
            <ol className="space-y-6">
              {team.evolution.map((era) => (
                <li key={era.year} className="grid gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_1fr_8rem]">
                  <p className="font-mono text-sm text-lime">{era.year}</p>
                  <div>
                    <h3 className="font-medium">{era.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{era.note}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo {era.tempo}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-lime" style={{ width: `${(era.tempo / maxTempo) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>

        <TabsContent value="health" className="mt-4">
          <div className="grid gap-3">
            {team.health.map((row) => (
              <Panel key={row.name} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {row.playerId && getPlayer(row.playerId) ? (
                      <button type="button" className="text-left font-medium hover:text-action" onClick={() => go("players", { playerId: row.playerId })}>
                        {row.name}
                      </button>
                    ) : (
                      <p className="font-medium">{row.name}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {row.role} · {row.note}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      row.risk === "High"
                        ? "bg-destructive/20 text-destructive"
                        : row.risk === "Watch"
                          ? "bg-gold/15 text-gold"
                          : "bg-lime/15 text-lime"
                    }`}
                  >
                    {row.risk}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Meter label="Fitness" value={row.fitness} />
                  <Meter label="Workload" value={row.workload} />
                </div>
              </Panel>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="future" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {team.futures.map((future) => (
              <Panel key={future.year}>
                <Kicker>{future.year}</Kicker>
                <h3 className="mt-2 font-medium">Captain {future.captain}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{future.note}</p>
                <ol className="mt-4 space-y-1 text-sm">
                  {future.xi.map((name, index) => (
                    <li key={`${future.year}-${name}`} className="flex gap-2">
                      <span className="w-5 text-muted-foreground tabular-nums">{index + 1}</span>
                      {name}
                    </li>
                  ))}
                </ol>
              </Panel>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
