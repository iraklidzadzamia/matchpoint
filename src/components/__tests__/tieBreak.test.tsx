import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { SetScoreBar } from '../SetScoreBar';
import { createMatch, addPoint, getDisplayScore } from '../../engine/scoring';
import { MatchConfig, MatchState } from '../../engine/types';

const config: MatchConfig = {
  sport: 'tennis',
  format: 'singles',
  totalSets: 3,
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

/** Plays a real match up to 6:6, so the tie-break is entered the way it is in play. */
function matchAtTieBreak(): MatchState {
  let match = createMatch(config);
  let t = 0;
  const winGame = (side: 'side1' | 'side2') => {
    for (let i = 0; i < 4; i++) match = addPoint(match, side, (t += 1000));
  };
  for (let i = 0; i < 6; i++) {
    winGame('side1');
    winGame('side2');
  }
  return match;
}

function renderTexts(state: MatchState): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(<SetScoreBar state={state} />);
  });
  const texts: string[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return void texts.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  walk(instance.toJSON());
  return texts;
}

describe('tie-break', () => {
  test('a real match reaches a tie-break at six games all', () => {
    const match = matchAtTieBreak();
    expect(match.games).toEqual([6, 6]);
    expect(match.isTieBreak).toBe(true);
  });

  test('the score screen shows tie-break points, not 15/30/40', () => {
    let match = matchAtTieBreak();
    expect(getDisplayScore(match)).toEqual({ side1Score: '0', side2Score: '0' });

    match = addPoint(match, 'side1', 99000);
    expect(getDisplayScore(match)).toEqual({ side1Score: '1', side2Score: '0' });

    // Five to the other side — one short of the two-clear-points finish
    for (let i = 0; i < 5; i++) match = addPoint(match, 'side2', 100000 + i);
    expect(getDisplayScore(match)).toEqual({ side1Score: '1', side2Score: '5' });
    expect(match.isTieBreak).toBe(true);
  });

  test('the top bar still reads correctly during a tie-break', () => {
    const match = matchAtTieBreak();
    const texts = renderTexts(match);

    expect(texts).toContain('Irakli');
    expect(texts).toContain('Rafael');
    // The set score stays at 6-6 while the tie-break is played out
    expect(texts.filter((t) => t === '6')).toHaveLength(2);
    expect(texts.filter((s) => s.startsWith('ui.'))).toEqual([]);
  });

  test('winning the tie-break closes the set at 7-6', () => {
    let match = matchAtTieBreak();
    for (let i = 0; i < 7; i++) match = addPoint(match, 'side1', 200000 + i);

    expect(match.isTieBreak).toBe(false);
    expect(match.completedSets).toEqual([[7, 6]]);
    expect(match.setsWon).toEqual([1, 0]);
    expect(match.games).toEqual([0, 0]);
  });

  test('a two-digit tie-break score still renders', () => {
    let match = matchAtTieBreak();
    // 10-10 needs two clear points to end, so the score keeps climbing
    for (let i = 0; i < 20; i++) {
      match = addPoint(match, i % 2 === 0 ? 'side1' : 'side2', 300000 + i);
    }
    const shown = getDisplayScore(match);
    expect(shown).toEqual({ side1Score: '10', side2Score: '10' });
    expect(match.isTieBreak).toBe(true);
  });
});
