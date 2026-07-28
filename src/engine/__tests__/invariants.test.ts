import { createMatch, addPoint, getDisplayScore, toMatchRecord } from '../scoring';
import { MatchHistoryStack } from '../history';
import { MatchConfig, MatchState, PlayerSide } from '../types';

/**
 * Hand-picked cases only prove the cases someone thought of. This plays
 * thousands of random matches under every rule combination and checks, after
 * every single point, that the state is one the rules can actually produce.
 */

function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const SPORTS = ['tennis', 'padel'] as const;
const FORMATS = ['singles', 'doubles'] as const;
const TOTAL_SETS = [1, 3, 5] as const;
const SWAP = ['off', 'oddGames', 'everySet'] as const;
const ADVANTAGES = [0, 1, 2] as const;

function randomConfig(rng: () => number): MatchConfig {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  return {
    sport: pick(SPORTS),
    format: pick(FORMATS),
    totalSets: pick(TOTAL_SETS),
    tieBreakEnabled: rng() < 0.85,
    matchTieBreakEnabled: rng() < 0.4,
    tieBreakTo: 7,
    goldenPointEnabled: rng() < 0.5,
    advantagesBeforeGolden: pick(ADVANTAGES),
    swapSides: pick(SWAP),
    side1: { player1: 'A1', player2: 'A2' },
    side2: { player1: 'B1', player2: 'B2' },
    servingFirst: rng() < 0.5 ? 'side1' : 'side2',
    scoreKeeper: rng() < 0.5 ? 'side1' : 'side2',
  };
}

function setsNeeded(config: MatchConfig): number {
  return Math.ceil(config.totalSets / 2);
}

/** Everything that must hold of a match state, whatever route it took. */
function checkInvariants(state: MatchState, where: string) {
  const ctx = (msg: string) =>
    `${msg} [${where}] pts=${state.points} games=${state.games} sets=${state.setsWon} ` +
    `tb=${state.isTieBreak || state.isMatchTieBreak} tbPts=${state.tieBreakPoints}`;

  const inTieBreak = state.isTieBreak || state.isMatchTieBreak;

  // Points
  for (const p of state.points) {
    expect(Number.isInteger(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(3);
  }
  // 40:40 is the only way both sides hold three points, and it must be deuce.
  if (state.points[0] === 3 && state.points[1] === 3) {
    expect(state.isDeuce).toBe(true);
  }
  if (state.isDeuce) {
    expect(state.points).toEqual([3, 3]);
  } else {
    expect(state.advantage).toBeNull();
  }
  if (state.advantage !== null) {
    expect(state.isDeuce).toBe(true);
  }
  expect(state.advantageCount).toBeGreaterThanOrEqual(0);

  // Tie-break bookkeeping only exists inside a tie-break
  expect(state.isTieBreak && state.isMatchTieBreak).toBe(false);
  if (!inTieBreak) {
    expect(state.tieBreakPoints).toEqual([0, 0]);
    expect(state.tieBreakStartServer).toBeNull();
  } else {
    expect(state.tieBreakStartServer).not.toBeNull();
    expect(state.points).toEqual([0, 0]);
  }
  for (const p of state.tieBreakPoints) expect(p).toBeGreaterThanOrEqual(0);

  // Games — a set cannot run away
  for (const g of state.games) {
    expect(g).toBeGreaterThanOrEqual(0);
    expect(g).toBeLessThanOrEqual(30);
  }
  if (state.config.tieBreakEnabled) {
    // With a tie-break, 6:6 is decided immediately, so 7 games is the ceiling.
    expect(Math.max(...state.games)).toBeLessThanOrEqual(7);
  }

  // Completed sets are sets somebody actually won
  expect(state.setsWon[0] + state.setsWon[1]).toBe(state.completedSets.length);
  for (const [g1, g2] of state.completedSets) {
    const hi = Math.max(g1, g2);
    const lo = Math.min(g1, g2);
    const legitimate = (hi >= 6 && hi - lo >= 2) || (hi === 7 && lo === 6);
    expect(ctx(`illegal set score ${g1}-${g2}`) && legitimate).toBe(true);
  }
  const wonByCount = state.completedSets.filter(([a, b]) => a > b).length;
  expect(state.setsWon[0]).toBe(wonByCount);

  // Match end
  const need = setsNeeded(state.config);
  expect(Math.max(...state.setsWon)).toBeLessThanOrEqual(need);
  if (state.matchStatus === 'finished') {
    expect(state.matchWinner).not.toBeNull();
    const idx = state.matchWinner === 'side1' ? 0 : 1;
    expect(state.setsWon[idx]).toBe(need);
    expect(typeof state.matchEndTime).toBe('number');
  } else {
    expect(state.matchWinner).toBeNull();
    expect(state.matchEndTime).toBeNull();
    expect(Math.max(...state.setsWon)).toBeLessThan(need);
  }

  // Serving
  expect(['side1', 'side2']).toContain(state.serving);
  for (const i of state.serverPlayerIndex) expect([0, 1]).toContain(i);
  expect(['original', 'swapped']).toContain(state.courtSide);

  // The display never produces something unshowable
  const shown = getDisplayScore(state);
  for (const value of [shown.side1Score, shown.side2Score]) {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  }
}

function playMatch(seed: number) {
  const rng = makeRng(seed);
  const config = randomConfig(rng);
  let state = createMatch(config);
  checkInvariants(state, `seed ${seed} start`);

  let points = 0;
  const LIMIT = 4000; // a real 5-setter is well under this
  while (state.matchStatus !== 'finished' && points < LIMIT) {
    const winner: PlayerSide = rng() < 0.5 ? 'side1' : 'side2';
    state = addPoint(state, winner);
    points += 1;
    checkInvariants(state, `seed ${seed} point ${points}`);
  }

  // A match with a random winner each point must always reach an end.
  expect(points).toBeLessThan(LIMIT);
  return { state, config, points };
}

describe('scoring engine invariants', () => {
  test('300 random matches under random rules always stay legal and terminate', () => {
    for (let seed = 1; seed <= 300; seed++) {
      playMatch(seed * 7919);
    }
  });

  test('a finished match is frozen', () => {
    const { state } = playMatch(12345);
    expect(state.matchStatus).toBe('finished');
    const after = addPoint(addPoint(state, 'side1'), 'side2');
    expect(after).toBe(state);
  });

  test('every finished match converts to a history record that matches it', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = playMatch(seed * 104729);
      const record = toMatchRecord(state)!;
      expect(record).not.toBeNull();
      expect(record.winner).toBe(state.matchWinner);
      expect(record.setScores).toEqual(state.completedSets);
      expect(record.setsWon).toEqual(state.setsWon);
    }
  });

  // The whole match state is written to AsyncStorage as JSON on every point.
  test('state survives a round trip through storage unchanged', () => {
    const rng = makeRng(555);
    let state = createMatch(randomConfig(rng));
    for (let i = 0; i < 400 && state.matchStatus !== 'finished'; i++) {
      state = addPoint(state, rng() < 0.5 ? 'side1' : 'side2');
      const restored: MatchState = JSON.parse(JSON.stringify(state));
      expect(restored).toEqual(state);
      // and the restored state can still be played on
      checkInvariants(restored, `restored at ${i}`);
    }
  });

  test('undo returns the exact state that preceded each point', () => {
    const rng = makeRng(777);
    const stack = new MatchHistoryStack();
    let state = createMatch(randomConfig(rng));
    const seen: MatchState[] = [];

    for (let i = 0; i < 120 && state.matchStatus !== 'finished'; i++) {
      seen.push(JSON.parse(JSON.stringify(state)));
      stack.push(state);
      state = addPoint(state, rng() < 0.5 ? 'side1' : 'side2');
    }

    while (stack.canUndo()) {
      const expected = seen.pop()!;
      const restored = stack.pop()!;
      expect(restored).toEqual(expected);
      checkInvariants(restored, 'after undo');
    }
  });

  test('the same points always produce the same match', () => {
    const config = randomConfig(makeRng(31337));
    const sequence = Array.from({ length: 200 }, (_, i) =>
      (i * 7) % 3 === 0 ? 'side2' : ('side1' as PlayerSide)
    ) as PlayerSide[];

    const run = () => {
      let state = createMatch({ ...config });
      for (const winner of sequence) state = addPoint(state, winner);
      // matchStartTime is a clock reading, so compare everything else
      const { matchStartTime, matchEndTime, ...rest } = state;
      return rest;
    };

    expect(run()).toEqual(run());
  });
});
