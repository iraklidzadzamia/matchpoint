import { MatchRecord, PlayerSide, Sport } from './types';

/**
 * Totals across every saved match, for the statistics screen.
 *
 * The thing to understand before reading this file: a match only knows whether
 * *you* won if it carries `yourSide`, and matches saved before that field
 * existed do not. Those records still count as matches played — they happened —
 * but they cannot count towards won or lost, and this file never guesses. That
 * is why `played` and `won + lost` are two different numbers, and why
 * `ranked` exists to say how many of them the record could actually judge.
 */

export interface HeadToHead {
  /** The other side's name, exactly as it was saved. */
  name: string;
  played: number;
  won: number;
  lost: number;
}

export interface SportSplit {
  sport: Sport;
  played: number;
  won: number;
  lost: number;
}

export interface CareerStats {
  played: number;
  /** Matches that carry `yourSide`, so won and lost mean something. */
  ranked: number;
  won: number;
  lost: number;
  /** Fraction of ranked matches won, or null when nothing can be judged. */
  winRate: number | null;
  totalSec: number;
  totalPoints: number;
  /** Consecutive wins in the most recent ranked matches, counting backwards. */
  currentStreak: number;
  longestMatch: MatchRecord | null;
  bySport: SportSplit[];
  opponents: HeadToHead[];
  partners: HeadToHead[];
}

const other = (side: PlayerSide): PlayerSide => (side === 'side1' ? 'side2' : 'side1');

/** Null unless the record knows which side was yours. */
function youWon(record: MatchRecord): boolean | null {
  if (!record.yourSide) return null;
  return record.winner === record.yourSide;
}

function sideName(record: MatchRecord, side: PlayerSide): string {
  return side === 'side1' ? record.side1Name : record.side2Name;
}

/** Accumulates one head-to-head row per name, in first-seen order. */
class Tally {
  private rows = new Map<string, HeadToHead>();

  add(name: string, won: boolean | null) {
    const row = this.rows.get(name) ?? { name, played: 0, won: 0, lost: 0 };
    row.played += 1;
    if (won === true) row.won += 1;
    if (won === false) row.lost += 1;
    this.rows.set(name, row);
  }

  /** Most played first; ties broken by name so the order never flickers. */
  ranked(): HeadToHead[] {
    return [...this.rows.values()].sort(
      (a, b) => b.played - a.played || a.name.localeCompare(b.name)
    );
  }
}

export function computeCareerStats(history: MatchRecord[]): CareerStats {
  const opponents = new Tally();
  const partners = new Tally();
  const sports = new Map<Sport, SportSplit>();

  let ranked = 0;
  let won = 0;
  let lost = 0;
  let totalSec = 0;
  let totalPoints = 0;
  let longestMatch: MatchRecord | null = null;

  for (const record of history) {
    const win = youWon(record);
    if (win !== null) {
      ranked += 1;
      if (win) won += 1;
      else lost += 1;
    }

    totalSec += record.durationSec;
    totalPoints += record.pointLog?.length ?? 0;
    if (!longestMatch || record.durationSec > longestMatch.durationSec) {
      longestMatch = record;
    }

    const split =
      sports.get(record.sport) ?? { sport: record.sport, played: 0, won: 0, lost: 0 };
    split.played += 1;
    if (win === true) split.won += 1;
    if (win === false) split.lost += 1;
    sports.set(record.sport, split);

    // Who you played against only means something when the record knows your
    // side; otherwise both names are just the two sides of a match.
    if (record.yourSide) {
      opponents.add(sideName(record, other(record.yourSide)), win);

      // In doubles your side is saved as "you & partner" — nothing records
      // which of the pair held the phone, so the second name is taken as the
      // partner. Enter yourself first and this is right; enter yourself second
      // and the two names swap roles.
      const ownSide = sideName(record, record.yourSide);
      const partner = ownSide.split(' & ')[1];
      if (record.format === 'doubles' && partner) partners.add(partner, win);
    }
  }

  return {
    played: history.length,
    ranked,
    won,
    lost,
    winRate: ranked > 0 ? won / ranked : null,
    totalSec,
    totalPoints,
    currentStreak: countStreak(history),
    longestMatch,
    // Padel before tennis when both are equal — most of this app's users play it.
    bySport: [...sports.values()].sort((a, b) => b.played - a.played),
    opponents: opponents.ranked(),
    partners: partners.ranked(),
  };
}

/**
 * Wins in a row, most recent first. History arrives newest-first, so this walks
 * forwards from the start and stops at the first loss. Matches that cannot be
 * judged are skipped rather than treated as a loss — one old record in the
 * middle should not silently erase a real streak.
 */
function countStreak(history: MatchRecord[]): number {
  let streak = 0;
  for (const record of history) {
    const win = youWon(record);
    if (win === null) continue;
    if (!win) break;
    streak += 1;
  }
  return streak;
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
