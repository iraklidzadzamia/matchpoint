import { createMatch, addPoint, getDisplayScore, getSideNames } from '../scoring';
import { MatchConfig } from '../types';

describe('MatchPoint Scoring Engine', () => {
  const defaultConfig: MatchConfig = {
    sport: 'tennis',
    format: 'singles',
    totalSets: 3,
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

  test('golden point after one advantage', () => {
    let match = createMatch({ ...defaultConfig, goldenPointEnabled: true, advantagesBeforeGolden: 1 });
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side1');
    for (let i = 0; i < 3; i++) match = addPoint(match, 'side2');
    expect(match.isDeuce).toBe(true);

    match = addPoint(match, 'side1'); // advantage side1
    expect(match.advantage).toBe('side1');

    match = addPoint(match, 'side2'); // back to deuce, one advantage used
    expect(match.advantage).toBeNull();
    expect(match.advantageCount).toBe(1);

    match = addPoint(match, 'side2'); // golden point decides
    expect(match.games).toEqual([0, 1]);
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

  test('getSideNames joins both players in doubles', () => {
    const config: MatchConfig = {
      ...defaultConfig,
      format: 'doubles',
      side1: { player1: 'A1', player2: 'A2' },
    };
    expect(getSideNames(config, 'side1')).toBe('A1 & A2');
  });
});
