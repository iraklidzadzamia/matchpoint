import { MatchRecord } from './types';

/**
 * A session is one outing — the court was booked, several matches were played,
 * everyone went home. Nothing records that, and nothing needs to: the times are
 * already in the history, so sessions are worked out from the gaps between
 * matches. That means they also apply to everything saved before this file
 * existed.
 */

export interface Session {
  /** When the first match of the outing started. */
  startedAt: number;
  /** When the last match of it finished. */
  endedAt: number;
  /** Newest first, matching the order history arrives in. */
  matches: MatchRecord[];
  played: number;
  /** Time from the first serve to the last point, gaps between matches included. */
  elapsedSec: number;
}

/**
 * Three hours. Long enough that a break for coffee, a court change or waiting
 * for a fourth player stays inside one session; short enough that playing in
 * the morning and again in the evening reads as two.
 */
export const DEFAULT_SESSION_GAP_SEC = 3 * 3600;

const endOf = (record: MatchRecord) => record.startedAt + record.durationSec * 1000;

/**
 * Groups history into sessions, newest first.
 *
 * Expects history newest-first, the order storage returns. Matches are compared
 * on the gap between one finishing and the next starting — not on the calendar
 * day, which would split a session that runs past midnight.
 */
export function groupIntoSessions(
  history: MatchRecord[],
  gapSec: number = DEFAULT_SESSION_GAP_SEC
): Session[] {
  const sessions: Session[] = [];
  let current: MatchRecord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    // `current` is newest-first, so the outing began with the last of them.
    const oldest = current[current.length - 1];
    const newest = current[0];
    sessions.push({
      startedAt: oldest.startedAt,
      endedAt: endOf(newest),
      matches: current,
      played: current.length,
      elapsedSec: Math.max(0, Math.round((endOf(newest) - oldest.startedAt) / 1000)),
    });
    current = [];
  };

  for (let i = 0; i < history.length; i++) {
    current.push(history[i]);

    const older = history[i + 1];
    if (!older) break;
    // Gap between the older match ending and this one starting. Negative would
    // mean they overlap, which is still the same outing.
    const gap = (history[i].startedAt - endOf(older)) / 1000;
    if (gap > gapSec) flush();
  }
  flush();

  return sessions;
}

/** "Today", "Yesterday", or a date — whichever a person would actually say. */
export function sessionDayLabel(
  startedAt: number,
  labels: { today: string; yesterday: string },
  now: number = Date.now()
): string {
  const startOfDay = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const days = Math.round((startOfDay(now) - startOfDay(startedAt)) / 86400000);
  if (days === 0) return labels.today;
  if (days === 1) return labels.yesterday;

  return new Date(startedAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: startOfDay(now) - startOfDay(startedAt) > 300 * 86400000 ? 'numeric' : undefined,
  });
}
