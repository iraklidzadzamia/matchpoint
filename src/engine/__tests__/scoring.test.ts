import { createMatch, addPoint, getDisplayScore, getSideNames, toMatchRecord } from '../scoring';
import { MatchConfig } from '../types';
import { MatchHistoryStack } from '../history';

describe('MatchPoint Scoring Engine', () => {
  const defaultConfig: MatchConfig = {
    sport: 'tennis',
    format: 'singles',
    totalSets: 3,
    gamesPerSet: 6,
    tieBreakEnabled: true,
    matchTieBreakEnabled: false,
    tieBreakTo: 7,
    goldenPointEnabled: false,
    advantagesBeforeGolden: 1,
    swapSides: 'oddGames',
    side1: { player1: 'Irakli' },
    side2: { player1: 'Rafael' },
    servingFirst: 'side1',
    scoreKeeper: 'side1',
  };

  test('creates new match correctly', () => {
    const match = createMatch(defaultConfig);
    expect(match.points).toEqual([0, 0]);
    expect(match.games).toEqual([0, 0]);
    expect(match.setsWon).toEqual([0, 0]);
    expect(match.matchStatus).toBe('playing');
  });

  test('normal points flow: 0 -> 15 -> 30 -> 40 -> Game', () => {
    let match = createMatch(defaultConfig);
    
    match = addPoint(match, 'side1'); // 15:0
    expect(getDisplayScore(match)).toEqual({ side1Score: '15', side2Score: '0' });

    match = addPoint(match, 'side2'); // 15:15
    expect(getDisplayScore(match)).toEqual({ side1Score: '15', side2Score: '15' });

    match = addPoint(match, 'side1'); // 30:15
    match = addPoint(match, 'side1'); // 40:15
    expect(getDisplayScore(match)).toEqual({ side1Score: '40', side2Score: '15' });

    match = addPoint(match, 'side1'); // Game won!
    expect(match.games).toEqual([1, 0]);
    expect(match.points).toEqual([0, 0]);
  });

  test('deuce and advantage flow', () => {
    let match = createMatch(defaultConfig);
    // Get to 40:40
    match = addPoint(match, 'side1'); // 15:0
    match = addPoint(match, 'side1'); // 30:0
    match = addPoint(match, 'side1'); // 40:0
    match = addPoint(match, 'side2'); // 40:15
    match = addPoint(match, 'side2'); // 40:30
    match = addPoint(match, 'side2'); // 40:40 (Deuce)

    expect(match.isDeuce).toBe(true);
    expect(getDisplayScore(match)).toEqual({ side1Score: '40', side2Score: '40' });

    // Advantage Side 1
    match = addPoint(match, 'side1');
    expect(getDisplayScore(match)).toEqual({ side1Score: 'AD', side2Score: '40' });

    // Back to Deuce
    match = addPoint(match, 'side2');
    expect(match.isDeuce).toBe(true);
    expect(match.advantage).toBeNull();

    // Advantage Side 2
    match = addPoint(match, 'side2');
    expect(getDisplayScore(match)).toEqual({ side1Score: '40', side2Score: 'AD' });

    // Side 2 wins game
    match = addPoint(match, 'side2');
    expect(match.games).toEqual([0, 1]);
  });

  test('golden point rule at 40:40', () => {
    const padelConfig: MatchConfig = {
      ...defaultConfig,
      sport: 'padel',
      goldenPointEnabled: true,
      advantagesBeforeGolden: 0,
    };
    let match = createMatch(padelConfig);
    // Reached 40:40
    match = addPoint(match, 'side1');
    match = addPoint(match, 'side1');
    match = addPoint(match, 'side1');
    match = addPoint(match, 'side2');
    match = addPoint(match, 'side2');
    match = addPoint(match, 'side2'); // Immediate Golden Point game win!

    // Next point immediately wins game
    match = addPoint(match, 'side2');
    expect(match.games).toEqual([0, 1]);
  });

  test('tie-break at 6:6', () => {
    let match = createMatch(defaultConfig);
    match.games = [6, 6];
    match.isTieBreak = true;

    match = addPoint(match, 'side1'); // 1:0
    expect(getDisplayScore(match)).toEqual({ side1Score: '1', side2Score: '0' });
  });

  test('lastEvent is null before any point is played', () => {
    const match = createMatch(defaultConfig);
    expect(match.lastEvent).toBeNull();
  });

  test('entering deuce does not swallow the next point', () => {
    let match = createMatch(defaultConfig);
    // 40:40
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');

    expect(match.isDeuce).toBe(true);
    expect(match.advantage).toBeNull();

    // A single point after deuce must produce advantage — not be absorbed
    match = addPoint(match, 'side1');
    expect(match.advantage).toBe('side1');
    expect(getDisplayScore(match)).toEqual({ side1Score: 'AD', side2Score: '40' });

    // And a single further point must win the game
    match = addPoint(match, 'side1');
    expect(match.games).toEqual([1, 0]);
  });

  test('classic deuce allows unlimited advantages', () => {
    let match = createMatch(defaultConfig); // goldenPointEnabled: false
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');
    expect(match.isDeuce).toBe(true);

    // Three full advantage-then-back-to-deuce cycles must never end the game
    for (let cycle = 0; cycle < 3; cycle++) {
      match = addPoint(match, 'side1');
      expect(match.advantage).toBe('side1');
      match = addPoint(match, 'side2');
      expect(match.advantage).toBeNull();
      expect(match.games).toEqual([0, 0]);
    }

    // Only advantage followed by another point wins it
    match = addPoint(match, 'side2');
    expect(match.advantage).toBe('side2');
    match = addPoint(match, 'side2');
    expect(match.games).toEqual([0, 1]);
  });

  // FIP Rule 1, Option 2: deuce 1 -> advantage 1 -> deuce 2 -> advantage 2 ->
  // deuce 3, where a single Star Point decides the game.
  test('star point decides only at the third deuce', () => {
    let match = createMatch({ ...defaultConfig, goldenPointEnabled: true, advantagesBeforeGolden: 2 });
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');
    expect(match.isDeuce).toBe(true); // deuce 1

    match = addPoint(match, 'side1'); // advantage 1
    expect(match.advantage).toBe('side1');
    match = addPoint(match, 'side2'); // deuce 2
    expect(match.games).toEqual([0, 0]);

    match = addPoint(match, 'side1'); // advantage 2 — must NOT end the game yet
    expect(match.advantage).toBe('side1');
    expect(match.games).toEqual([0, 0]);

    match = addPoint(match, 'side2'); // deuce 3
    expect(match.advantage).toBeNull();
    expect(match.games).toEqual([0, 0]);

    match = addPoint(match, 'side2'); // star point decides
    expect(match.games).toEqual([0, 1]);
  });

  test('an advantage still wins the game outright under star point', () => {
    let match = createMatch({ ...defaultConfig, goldenPointEnabled: true, advantagesBeforeGolden: 2 });
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');

    match = addPoint(match, 'side1'); // advantage 1
    match = addPoint(match, 'side1'); // converted
    expect(match.games).toEqual([1, 0]);
  });

  test('golden point decides at the very first deuce', () => {
    let match = createMatch({ ...defaultConfig, goldenPointEnabled: true, advantagesBeforeGolden: 0 });
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');
    expect(match.isDeuce).toBe(true);

    match = addPoint(match, 'side2');
    expect(match.games).toEqual([0, 1]);
  });

  // FIP Rule 1, Tie-Break §5: the next set is opened by the pair that did not
  // open the tie-break — not simply whoever served the last point.
  test('the set after a tie-break is opened by the pair that did not open it', () => {
    let match = createMatch(defaultConfig);
    match.games = [6, 5];
    match.points = [0, 3];
    match = addPoint(match, 'side2'); // 6:6 -> tie-break starts

    expect(match.isTieBreak).toBe(true);
    const tieBreakOpener = match.serving;
    expect(match.tieBreakStartServer).toBe(tieBreakOpener);

    // Win the tie-break 7-0, an odd number of points
    for (let i = 0; i < 7; i++) match = addPoint(match, 'side1');
    expect(match.setsWon).toEqual([1, 0]);
    expect(match.serving).toBe(tieBreakOpener === 'side1' ? 'side2' : 'side1');
    expect(match.tieBreakStartServer).toBeNull();
  });

  test('doubles tie-break rotates the serving player index', () => {
    let match = createMatch({
      ...defaultConfig,
      format: 'doubles',
      side1: { player1: 'A1', player2: 'A2' },
      side2: { player1: 'B1', player2: 'B2' },
    });
    match.games = [6, 6];
    match.isTieBreak = true;

    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const sideIdx = match.serving === 'side1' ? 0 : 1;
      seen.add(`${match.serving}:${match.serverPlayerIndex[sideIdx]}`);
      match = addPoint(match, i % 2 === 0 ? 'side1' : 'side2');
    }

    // All four doubles players must take a turn serving during the tie-break
    expect(seen).toContain('side1:0');
    expect(seen).toContain('side1:1');
    expect(seen).toContain('side2:0');
    expect(seen).toContain('side2:1');
  });

  test('tie-break swaps court sides every 6 points', () => {
    let match = createMatch(defaultConfig);
    match.games = [6, 6];
    match.isTieBreak = true;
    expect(match.courtSide).toBe('original');

    for (let i = 0; i < 5; i++) match = addPoint(match, i % 2 === 0 ? 'side1' : 'side2');
    expect(match.courtSide).toBe('original'); // 5 points played

    match = addPoint(match, 'side2'); // 6th point
    expect(match.courtSide).toBe('swapped');

    for (let i = 0; i < 6; i++) match = addPoint(match, i % 2 === 0 ? 'side1' : 'side2');
    expect(match.courtSide).toBe('original'); // 12th point
  });

  test('with auto-swap off the tie-break leaves the court sides alone', () => {
    let match = createMatch({ ...defaultConfig, swapSides: 'off' });
    match.games = [6, 6];
    match.isTieBreak = true;

    for (let i = 0; i < 12; i++) match = addPoint(match, i % 2 === 0 ? 'side1' : 'side2');
    expect(match.courtSide).toBe('original');
  });

  test('with auto-swap off winning games never moves the sides', () => {
    let match = createMatch({ ...defaultConfig, swapSides: 'off' });
    for (let game = 0; game < 3; game++) {
      for (let i = 0; i < 4; i++) match = addPoint(match, 'side1');
    }
    expect(match.games).toEqual([3, 0]);
    expect(match.courtSide).toBe('original');
  });

  test('set point flag is set when one point from the set', () => {
    let match = createMatch(defaultConfig);
    match.games = [5, 4];
    match.points = [2, 2]; // 30:30

    match = addPoint(match, 'side1'); // 40:30 -> set point
    expect(match.lastEvent?.isSetPoint).toBe(true);
    expect(match.lastEvent?.isMatchPoint).toBe(false);
  });

  test('no set point at 5:5 since winning the game only makes it 6:5', () => {
    let match = createMatch(defaultConfig);
    match.games = [5, 5];
    match.points = [2, 2];

    match = addPoint(match, 'side1'); // 40:30 at 5:5
    expect(match.lastEvent?.isSetPoint).toBe(false);
  });

  test('match point flag when one point from winning the match', () => {
    let match = createMatch(defaultConfig);
    match.setsWon = [1, 0]; // needs 2 of 3
    match.games = [5, 3];
    match.points = [2, 1];

    match = addPoint(match, 'side1'); // 40:30 -> match point
    expect(match.lastEvent?.isSetPoint).toBe(true);
    expect(match.lastEvent?.isMatchPoint).toBe(true);
  });

  test('break point flag when the returner is one point from the game', () => {
    let match = createMatch(defaultConfig); // side1 serves first
    match.points = [1, 2]; // 15:30

    match = addPoint(match, 'side2'); // 15:40, returner one point from break
    expect(match.lastEvent?.isBreakPoint).toBe(true);
  });

  test('the deciding point of a game carries its conversion flags', () => {
    let match = createMatch(defaultConfig);
    match.games = [5, 4];
    match.points = [3, 1]; // 40:15, serving side1, set point

    match = addPoint(match, 'side1'); // wins game -> wins set
    expect(match.lastEvent?.type).toBe('set');
    expect(match.lastEvent?.isSetPoint).toBe(true);
    expect(match.setsWon).toEqual([1, 0]);
  });

  test('full set win records completed set and resets games', () => {
    let match = createMatch(defaultConfig);
    match.games = [5, 0];
    match.points = [3, 0];

    match = addPoint(match, 'side1');
    expect(match.completedSets).toEqual([[6, 0]]);
    expect(match.games).toEqual([0, 0]);
    expect(match.setsWon).toEqual([1, 0]);
  });

  test('match finishes and stamps an end time', () => {
    let match = createMatch({ ...defaultConfig, totalSets: 1 });
    match.games = [5, 0];
    match.points = [3, 0];

    match = addPoint(match, 'side1');
    expect(match.matchStatus).toBe('finished');
    expect(match.matchWinner).toBe('side1');
    expect(typeof match.matchEndTime).toBe('number');
  });

  test('no points are recorded after the match has finished', () => {
    let match = createMatch({ ...defaultConfig, totalSets: 1 });
    match.games = [5, 0];
    match.points = [3, 0];
    match = addPoint(match, 'side1');

    const finished = match;
    match = addPoint(match, 'side2');
    expect(match).toBe(finished);
  });

  test('server alternates between games', () => {
    let match = createMatch(defaultConfig);
    expect(match.serving).toBe('side1');
    for (let i = 0; i < 4; i++) match = addPoint(match, 'side1');
    expect(match.serving).toBe('side2');
  });

  test('an unfinished match produces no history record', () => {
    const match = createMatch(defaultConfig);
    expect(toMatchRecord(match)).toBeNull();
  });

  test('a finished match becomes a history record with its set scores', () => {
    let match = createMatch({ ...defaultConfig, totalSets: 1 });
    match.games = [5, 3];
    match.points = [3, 0];
    match = addPoint(match, 'side1'); // 6:3, wins the only set

    const record = toMatchRecord(match);
    expect(record).not.toBeNull();
    expect(record!.winner).toBe('side1');
    expect(record!.setScores).toEqual([[6, 3]]);
    expect(record!.side1Name).toBe('Irakli');
    expect(record!.side2Name).toBe('Rafael');
    expect(record!.durationSec).toBeGreaterThanOrEqual(0);
  });

  // Groundwork for tying a saved video clip to the point it belongs to, and
  // for rally timings.
  describe('point log', () => {
    test('records every point in order, with the time it happened', () => {
      let match = createMatch(defaultConfig);
      match = addPoint(match, 'side1', 1000);
      match = addPoint(match, 'side2', 2500);
      match = addPoint(match, 'side1', 4000);

      expect(match.pointLog).toEqual([
        { at: 1000, winner: 'side1', type: 'point' },
        { at: 2500, winner: 'side2', type: 'point' },
        { at: 4000, winner: 'side1', type: 'point' },
      ]);
    });

    test('marks the point that won a game, set or match', () => {
      let match = createMatch({ ...defaultConfig, totalSets: 1 });
      match.games = [5, 0];
      for (let i = 0; i < 4; i++) match = addPoint(match, 'side1', 100 * i);

      expect(match.pointLog.map((p) => p.type)).toEqual(['point', 'point', 'point', 'match']);
    });

    test('undo takes the point back out of the log', () => {
      const stack = new MatchHistoryStack();
      let match = createMatch(defaultConfig);
      match = addPoint(match, 'side1', 1000);
      stack.push(match);
      match = addPoint(match, 'side2', 2000);
      expect(match.pointLog).toHaveLength(2);

      const restored = stack.pop()!;
      expect(restored.pointLog).toHaveLength(1);
    });

    test('a finished match carries its log into history', () => {
      let match = createMatch({ ...defaultConfig, totalSets: 1 });
      match.games = [5, 0];
      for (let i = 0; i < 4; i++) match = addPoint(match, 'side1', 100 * i);

      const record = toMatchRecord(match)!;
      expect(record.pointLog).toHaveLength(4);
      expect(record.pointLog[3]).toEqual({ at: 300, winner: 'side1', type: 'match' });
    });

    test('the log is a copy, so editing the record cannot corrupt the match', () => {
      let match = createMatch({ ...defaultConfig, totalSets: 1 });
      match.games = [5, 0];
      for (let i = 0; i < 4; i++) match = addPoint(match, 'side1', 100 * i);

      const record = toMatchRecord(match)!;
      record.pointLog[0].at = 999999;
      expect(match.pointLog[0].at).toBe(0);
    });
  });

  test('getSideNames joins both players in doubles', () => {
    const config: MatchConfig = {
      ...defaultConfig,
      format: 'doubles',
      side1: { player1: 'A1', player2: 'A2' },
    };
    expect(getSideNames(config, 'side1')).toBe('A1 & A2');
  });

  describe('short and pro sets', () => {
    /** Hands `side` four straight points, taking one clean game. */
    const winGame = (state: any, side: 'side1' | 'side2') => {
      for (let i = 0; i < 4; i++) state = addPoint(state, side, 0);
      return state;
    };

    test('a short set is won at four games, not six', () => {
      let match = createMatch({ ...defaultConfig, gamesPerSet: 4, totalSets: 1 });
      for (let i = 0; i < 4; i++) match = winGame(match, 'side1');

      expect(match.matchStatus).toBe('finished');
      expect(match.completedSets).toEqual([[4, 0]]);
    });

    test('a short set still needs a two-game margin', () => {
      let match = createMatch({ ...defaultConfig, gamesPerSet: 4, totalSets: 1 });
      for (let i = 0; i < 3; i++) { match = winGame(match, 'side1'); match = winGame(match, 'side2'); }
      match = winGame(match, 'side1');

      // 4-3 is not a set — the margin is one.
      expect(match.matchStatus).toBe('playing');
      expect(match.games).toEqual([4, 3]);
    });

    test('a short set goes to a tie-break at four all', () => {
      let match = createMatch({ ...defaultConfig, gamesPerSet: 4, totalSets: 1 });
      for (let i = 0; i < 4; i++) { match = winGame(match, 'side1'); match = winGame(match, 'side2'); }

      expect(match.games).toEqual([4, 4]);
      expect(match.isTieBreak).toBe(true);
    });

    test('six games does not win a pro set', () => {
      let match = createMatch({ ...defaultConfig, gamesPerSet: 8, totalSets: 1 });
      for (let i = 0; i < 6; i++) match = winGame(match, 'side1');

      expect(match.matchStatus).toBe('playing');
      expect(match.games).toEqual([6, 0]);

      for (let i = 0; i < 2; i++) match = winGame(match, 'side1');
      expect(match.matchStatus).toBe('finished');
      expect(match.completedSets).toEqual([[8, 0]]);
    });

    test('a match saved before short sets existed still scores to six', () => {
      // Configs restored from storage predate the field entirely.
      const legacy = { ...defaultConfig, totalSets: 1 } as MatchConfig;
      delete (legacy as Partial<MatchConfig>).gamesPerSet;

      let match = createMatch(legacy);
      for (let i = 0; i < 4; i++) match = winGame(match, 'side1');
      expect(match.matchStatus).toBe('playing');

      for (let i = 0; i < 2; i++) match = winGame(match, 'side1');
      expect(match.matchStatus).toBe('finished');
      expect(match.completedSets).toEqual([[6, 0]]);
    });
  });
});
