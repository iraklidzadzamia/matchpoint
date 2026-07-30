import { MatchRecord, PlayerSide, PointRecord } from './types';

/**
 * Everything the detail screen shows is derived here, from the point log alone,
 * so it can be tested without rendering anything.
 *
 * The one thing to keep in mind reading this file: `at` is when the point was
 * *recorded* — the moment somebody tapped — not when the rally started. So a
 * gap between two points covers the rally plus the walk back to the baseline.
 * That is still the most useful number available, but it is not a rally length,
 * and nothing here pretends otherwise.
 */

export interface GameBreakdown {
  winner: PlayerSide;
  points: number;
  durationSec: number;
}

export interface SetBreakdown {
  score: [number, number];
  winner: PlayerSide;
  /** Points won by each side inside this set. */
  points: [number, number];
  durationSec: number;
  games: GameBreakdown[];
}

/**
 * How each side did on its own serve. Null for matches logged before the server
 * was recorded — that is unrecoverable, so the screen hides the section rather
 * than showing a confident zero.
 */
export interface ServeStats {
  /** Points played with that side serving. */
  played: [number, number];
  /** Of those, the ones that side won. */
  won: [number, number];
}

export interface MatchStats {
  totalPoints: number;
  pointsWon: [number, number];
  serve: ServeStats | null;
  /** Null when a match ran without a point log — records saved by older builds. */
  averagePointSec: number | null;
  longestGame: GameBreakdown | null;
  sets: SetBreakdown[];
}

const sideIndex = (side: PlayerSide) => (side === 'side1' ? 0 : 1);

/** A point that is not of type `point` is the last point of its game. */
const closesGame = (p: PointRecord) => p.type !== 'point';
const closesSet = (p: PointRecord) => p.type === 'set' || p.type === 'match';

export function computeMatchStats(record: MatchRecord): MatchStats {
  // Records written before the point log existed still have to open.
  const log = record.pointLog ?? [];

  const pointsWon: [number, number] = [0, 0];
  for (const p of log) pointsWon[sideIndex(p.winner)] += 1;

  // A single point without a server means the whole match predates the field —
  // a partially-served log is not a state the engine can produce.
  const served = log.filter((p) => p.served);
  let serve: ServeStats | null = null;
  if (served.length > 0) {
    const played: [number, number] = [0, 0];
    const won: [number, number] = [0, 0];
    for (const p of served) {
      const s = sideIndex(p.served!);
      played[s] += 1;
      if (p.winner === p.served) won[s] += 1;
    }
    serve = { played, won };
  }

  const sets: SetBreakdown[] = [];
  let games: GameBreakdown[] = [];
  let setPoints: [number, number] = [0, 0];
  let gamePoints = 0;
  let gameStart = record.startedAt;
  let setStart = record.startedAt;

  for (const p of log) {
    gamePoints += 1;
    setPoints[sideIndex(p.winner)] += 1;

    if (closesGame(p)) {
      games.push({
        winner: p.winner,
        points: gamePoints,
        durationSec: Math.max(0, Math.round((p.at - gameStart) / 1000)),
      });
      gamePoints = 0;
      gameStart = p.at;
    }

    if (closesSet(p)) {
      sets.push({
        // The set scores are the record's own; the log only says who and when.
        score: record.setScores[sets.length] ?? [0, 0],
        winner: p.winner,
        points: setPoints,
        durationSec: Math.max(0, Math.round((p.at - setStart) / 1000)),
        games,
      });
      games = [];
      setPoints = [0, 0];
      setStart = p.at;
    }
  }

  const allGames = sets.flatMap((s) => s.games);
  const longestGame = allGames.reduce<GameBreakdown | null>(
    (best, g) => (best === null || g.durationSec > best.durationSec ? g : best),
    null
  );

  // Measured from the first tap, not from the match start — the gap before the
  // opening point includes the warm-up and would drag the average up.
  const span = log.length > 1 ? log[log.length - 1].at - log[0].at : 0;
  const averagePointSec = log.length > 1 ? Math.round(span / (log.length - 1) / 100) / 10 : null;

  return {
    totalPoints: log.length,
    pointsWon,
    serve,
    averagePointSec,
    longestGame,
    sets,
  };
}

/**
 * Who was ahead on points, after every point of the match. Positive means side 1
 * leads. Used to draw the momentum line.
 */
export function pointDifferential(record: MatchRecord): number[] {
  let diff = 0;
  return (record.pointLog ?? []).map((p) => {
    diff += p.winner === 'side1' ? 1 : -1;
    return diff;
  });
}
