import { computeMatchStats, pointDifferential } from '../matchStats';
import { createMatch, addPoint, toMatchRecord } from '../scoring';
import { MatchConfig, MatchRecord, PlayerSide } from '../types';

const config: MatchConfig = {
  sport: 'tennis',
  format: 'singles',
  totalSets: 3,
  gamesPerSet: 6,
  tieBreakEnabled: true,
  matchTieBreakEnabled: false,
  tieBreakTo: 7,
  goldenPointEnabled: false,
  advantagesBeforeGolden: 1,
  swapSides: 'off',
  side1: { player1: 'Irakli' },
  side2: { player1: 'Rafael' },
  servingFirst: 'side1',
  scoreKeeper: 'side1',
};

/** A straight-sets win, every point 30 seconds apart, so the maths is checkable by hand. */
function playRecord(): MatchRecord {
  let state = createMatch(config);
  let t = state.matchStartTime;
  const point = (side: PlayerSide) => {
    state = addPoint(state, side, (t += 30_000));
  };
  const winGame = (side: PlayerSide) => {
    for (let i = 0; i < 4; i++) point(side);
  };
  // 6-0, 6-0
  for (let set = 0; set < 2; set++) {
    for (let game = 0; game < 6; game++) winGame('side1');
  }
  return toMatchRecord(state)!;
}

describe('match statistics', () => {
  test('counts every point in the log and splits it by side', () => {
    const record = playRecord();
    const stats = computeMatchStats(record);

    expect(stats.totalPoints).toBe(48); // 12 games × 4 points
    expect(stats.pointsWon).toEqual([48, 0]);
    expect(stats.pointsWon[0] + stats.pointsWon[1]).toBe(stats.totalPoints);
  });

  test('breaks the match into sets that agree with the recorded set scores', () => {
    const record = playRecord();
    const stats = computeMatchStats(record);

    expect(stats.sets).toHaveLength(2);
    expect(stats.sets.map((s) => s.score)).toEqual(record.setScores);
    expect(stats.sets.every((s) => s.winner === 'side1')).toBe(true);
    expect(stats.sets.map((s) => s.games.length)).toEqual([6, 6]);
    // Every point belongs to exactly one set
    const counted = stats.sets.reduce((n, s) => n + s.points[0] + s.points[1], 0);
    expect(counted).toBe(stats.totalPoints);
  });

  test('times games from the end of the previous one', () => {
    const record = playRecord();
    const stats = computeMatchStats(record);
    const games = stats.sets.flatMap((s) => s.games);

    // Four points, thirty seconds apart, is two minutes a game
    expect(games.slice(1).every((g) => g.durationSec === 120)).toBe(true);
    expect(stats.longestGame!.durationSec).toBe(120);
    expect(games.every((g) => g.points === 4)).toBe(true);
  });

  test('averages the gap between points, not from the match start', () => {
    const record = playRecord();
    expect(computeMatchStats(record).averagePointSec).toBe(30);
  });

  test('the running point difference ends where the point count says it should', () => {
    const record = playRecord();
    const diff = pointDifferential(record);

    expect(diff).toHaveLength(48);
    expect(diff[diff.length - 1]).toBe(48);
    // It is a running total, so it may only ever move by one
    diff.forEach((d, i) => expect(Math.abs(d - (diff[i - 1] ?? 0))).toBe(1));
  });

  test('a record saved before the point log existed still opens', () => {
    const record = playRecord();
    // Older builds wrote no pointLog at all
    delete (record as Partial<MatchRecord>).pointLog;

    const stats = computeMatchStats(record);
    expect(stats.totalPoints).toBe(0);
    expect(stats.pointsWon).toEqual([0, 0]);
    expect(stats.averagePointSec).toBeNull();
    expect(stats.longestGame).toBeNull();
    expect(stats.sets).toEqual([]);
    expect(pointDifferential(record)).toEqual([]);
  });

  test('a three-set match splits at the right points', () => {
    let state = createMatch(config);
    let t = state.matchStartTime;
    const winGame = (side: PlayerSide) => {
      for (let i = 0; i < 4; i++) state = addPoint(state, side, (t += 30_000));
    };
    for (let g = 0; g < 6; g++) winGame('side1');   // set 1 to side 1
    for (let g = 0; g < 6; g++) winGame('side2');   // set 2 to side 2
    for (let g = 0; g < 6; g++) winGame('side1');   // set 3 to side 1

    const stats = computeMatchStats(toMatchRecord(state)!);
    expect(stats.sets.map((s) => s.winner)).toEqual(['side1', 'side2', 'side1']);
    expect(stats.sets.map((s) => s.points)).toEqual([[24, 0], [0, 24], [24, 0]]);
    expect(stats.pointsWon).toEqual([48, 24]);
  });

  describe('serve', () => {
    test('splits points by who served them', () => {
      // A short set won 4-0 to love. The serve alternates every game, so side 1
      // served games one and three and side 2 served two and four — eight points
      // each, and side 1 won every one of them.
      let state = createMatch({ ...config, totalSets: 1, gamesPerSet: 4 });
      let t = state.matchStartTime;
      for (let i = 0; i < 16; i++) state = addPoint(state, 'side1', (t += 30_000));

      expect(state.matchStatus).toBe('finished');
      const stats = computeMatchStats(toMatchRecord(state)!);
      expect(stats.serve).toEqual({ played: [8, 8], won: [8, 0] });
    });

    test('is null for a match logged before the server was recorded', () => {
      const record: MatchRecord = {
        id: 'old',
        sport: 'padel',
        format: 'doubles',
        side1Name: 'A & B',
        side2Name: 'C & D',
        setScores: [[6, 0]],
        setsWon: [1, 0],
        winner: 'side1',
        startedAt: 0,
        durationSec: 600,
        pointLog: [{ at: 0, winner: 'side1', type: 'point' }],
      };
      expect(computeMatchStats(record).serve).toBeNull();
    });
  });
});
