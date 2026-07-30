import { MatchRecord, PlayerSide } from './types';

/**
 * A row per player, across every match in the history.
 *
 * There is deliberately no notion of "you" here. The phone is a scoreboard, not
 * a person: it gets passed around, and whoever holds it often is not playing.
 * Everybody gets a row and reads their own.
 *
 * Everything rests on `side1Players` / `side2Players`. Matches saved before those
 * existed only kept a joined display name, and "Irakli & Nika" cannot be split
 * back into two people with any confidence — somebody's name could contain an
 * ampersand. Those records are counted as skipped and named as such on screen,
 * never guessed at.
 */

export interface PlayerStats {
  name: string;
  played: number;
  won: number;
  lost: number;
  /** Points won by this player's side, in every match they played. */
  pointsWon: number;
  /** Every point of those matches, both sides. */
  pointsPlayed: number;
  /** Points this player personally served — needs `servedByPlayer` in the log. */
  servePointsPlayed: number;
  /** Of those, the ones their side won. */
  servePointsWon: number;
}

export interface GroupStats {
  /** Most matches first; ties broken by name so the order never flickers. */
  players: PlayerStats[];
  matchesCounted: number;
  /** Records too old to know who played — reported, never guessed. */
  matchesSkipped: number;
  totalSec: number;
}

const sideIndex = (side: PlayerSide) => (side === 'side1' ? 0 : 1);

function blank(name: string): PlayerStats {
  return {
    name,
    played: 0,
    won: 0,
    lost: 0,
    pointsWon: 0,
    pointsPlayed: 0,
    servePointsPlayed: 0,
    servePointsWon: 0,
  };
}

export function computeGroupStats(history: MatchRecord[]): GroupStats {
  const rows = new Map<string, PlayerStats>();
  const row = (name: string) => {
    const existing = rows.get(name);
    if (existing) return existing;
    const fresh = blank(name);
    rows.set(name, fresh);
    return fresh;
  };

  let matchesCounted = 0;
  let matchesSkipped = 0;
  let totalSec = 0;

  for (const record of history) {
    const sides: [string[], string[]] = [record.side1Players ?? [], record.side2Players ?? []];
    if (sides[0].length === 0 || sides[1].length === 0) {
      matchesSkipped += 1;
      continue;
    }

    matchesCounted += 1;
    totalSec += record.durationSec;

    const log = record.pointLog ?? [];
    const pointsBySide: [number, number] = [0, 0];
    for (const p of log) pointsBySide[sideIndex(p.winner)] += 1;

    for (const side of [0, 1] as const) {
      const won = sideIndex(record.winner) === side;
      for (const name of sides[side]) {
        const r = row(name);
        r.played += 1;
        if (won) r.won += 1;
        else r.lost += 1;
        r.pointsWon += pointsBySide[side];
        r.pointsPlayed += log.length;
      }
    }

    // Serve is credited to the individual, which is what `servedByPlayer` is
    // for. A blank second name can leave the index pointing past the end of the
    // side, so it is checked rather than trusted.
    for (const p of log) {
      if (!p.served || p.servedByPlayer === undefined) continue;
      const server = sides[sideIndex(p.served)][p.servedByPlayer];
      if (!server) continue;
      const r = row(server);
      r.servePointsPlayed += 1;
      if (p.winner === p.served) r.servePointsWon += 1;
    }
  }

  return {
    players: [...rows.values()].sort(
      (a, b) => b.played - a.played || a.name.localeCompare(b.name)
    ),
    matchesCounted,
    matchesSkipped,
    totalSec,
  };
}

/**
 * Who has not played yet in this session, and how many matches each of the
 * present players has had. The reason for knowing who turned up: with six people
 * and four on court, somebody has to notice who has been sitting down all
 * evening.
 */
export interface RotationRow {
  name: string;
  played: number;
}

export function countRotation(session: MatchRecord[], present: string[]): RotationRow[] {
  const counts = new Map(present.map((name) => [name, 0]));
  for (const record of session) {
    for (const name of [...(record.side1Players ?? []), ...(record.side2Players ?? [])]) {
      const seen = counts.get(name);
      if (seen !== undefined) counts.set(name, seen + 1);
    }
  }
  // Fewest matches first — the people who should go on next.
  return [...counts.entries()]
    .map(([name, played]) => ({ name, played }))
    .sort((a, b) => a.played - b.played || a.name.localeCompare(b.name));
}

/** "3h 20m", "45m", or "—" when nothing has been played. */
export function formatTotalTime(totalSec: number): string {
  if (totalSec <= 0) return '—';
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.round((totalSec % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
