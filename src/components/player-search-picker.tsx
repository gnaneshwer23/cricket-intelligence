"use client";

import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { teamLabel } from "@/lib/data";
import {
  PLAYER_SEARCH_DEBOUNCE_MS,
  PLAYER_SEARCH_EXAMPLES,
  PLAYER_SEARCH_MIN_CHARS,
  searchPlayers,
} from "@/lib/player-search";
import type { Player, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type RoleFilter = Role | "All";

type PlayerSearchPickerProps = {
  catalog: Player[];
  /** Controlled query — optional; unmanaged if omitted. */
  query?: string;
  onQueryChange?: (value: string) => void;
  roleFilter?: RoleFilter;
  onRoleFilterChange?: (role: RoleFilter) => void;
  showRoleFilters?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelect?: (player: Player) => void;
  /** Highlight the active detail subject (Players screen). */
  activeId?: string;
  boostIds?: string[];
  placeholder?: string;
  inputId?: string;
  emptyPrompt?: string;
  /** When true, selected chips are removable via onToggleSelect. */
  showSelectedChips?: boolean;
  resolveName?: (id: string) => string | undefined;
  className?: string;
  listClassName?: string;
  limit?: number;
};

export function PlayerSearchPicker({
  catalog,
  query: controlledQuery,
  onQueryChange,
  roleFilter = "All",
  onRoleFilterChange,
  showRoleFilters = false,
  selectedIds = [],
  onToggleSelect,
  onSelect,
  activeId,
  boostIds,
  placeholder = "Search Bradman, Kohli, Ambrose…",
  inputId = "player-search",
  emptyPrompt = "Type a name to search cricket history — not a dumped roster.",
  showSelectedChips = false,
  resolveName,
  className,
  listClassName,
  limit,
}: PlayerSearchPickerProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;
  const debounced = useDebouncedValue(query, PLAYER_SEARCH_DEBOUNCE_MS);
  const trimmed = debounced.trim();
  const searching = trimmed.length >= PLAYER_SEARCH_MIN_CHARS;

  const hits = useMemo(() => {
    if (!searching) return [];
    return searchPlayers(catalog, trimmed, {
      role: roleFilter,
      boostIds: [...(boostIds ?? []), ...selectedIds],
      limit,
    });
  }, [catalog, trimmed, searching, roleFilter, boostIds, selectedIds, limit]);

  const selectedChips = selectedIds.map((id) => ({
    id,
    name: catalog.find((player) => player.id === id)?.name ?? resolveName?.(id) ?? id,
  }));

  return (
    <div className={className}>
      {showSelectedChips && selectedChips.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedChips.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleSelect?.(item.id)}
              className="rounded-full border border-lime/40 bg-lime/10 px-3 py-1 text-xs text-foreground"
              title="Remove"
            >
              {item.name}
              <span className="ml-1.5 text-muted-foreground">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className={showRoleFilters ? "flex flex-col gap-3 sm:flex-row" : undefined}>
        <label className="sr-only" htmlFor={inputId}>
          Search players
        </label>
        <Input
          id={inputId}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-11"
          autoComplete="off"
          spellCheck={false}
        />
        {showRoleFilters && onRoleFilterChange ? (
          <div className="flex flex-wrap gap-1.5">
            {(["All", "Batter", "Bowler", "All-rounder", "Keeper"] as const).map((role) => (
              <Button
                key={role}
                type="button"
                size="sm"
                variant={roleFilter === role ? "default" : "secondary"}
                onClick={() => onRoleFilterChange(role)}
              >
                {role}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {!searching ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{emptyPrompt}</p>
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Try</p>
          <div className="flex flex-wrap gap-2">
            {PLAYER_SEARCH_EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs hover:border-lime/40 hover:text-lime"
                onClick={() => setQuery(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : hits.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          No matches for “{trimmed}”. Try another spelling, surname, or era name.
        </p>
      ) : (
        <ul className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 ${listClassName ?? ""}`}>
          {hits.map(({ player }) => {
            const selectedActive = selectedIds.includes(player.id);
            const detailActive = activeId === player.id;
            const active = selectedActive || detailActive;
            return (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect?.(player);
                    onToggleSelect?.(player.id);
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-lime bg-lime/10"
                      : "border-border bg-muted/35 hover:border-lime/30"
                  }`}
                >
                  <span className="block text-sm font-medium">{player.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {teamLabel(player.teamId)} · {player.role} · {player.span}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {searching && hits.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {hits.length} match{hits.length === 1 ? "" : "es"}
          {selectedIds.length ? ` · ${selectedIds.length} selected` : ""}
        </p>
      ) : null}
    </div>
  );
}
