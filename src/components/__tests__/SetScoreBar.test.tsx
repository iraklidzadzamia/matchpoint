import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

// Icon fonts pull in native asset loading that jest cannot resolve here.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { SetScoreBar } from '../SetScoreBar';
import { createMatch } from '../../engine/scoring';
import { MatchConfig, MatchState } from '../../engine/types';

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
  swapSides: 'oddGames',
  side1: { player1: 'Irakli' },
  side2: { player1: 'Rafael' },
  servingFirst: 'side1',
};

function renderTexts(state: MatchState): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(<SetScoreBar state={state} />);
  });
  const tree = instance.toJSON();
  const texts: string[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return texts.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  walk(tree);
  return texts;
}

describe('SetScoreBar', () => {
  test('shows side 1 on the left in the original court orientation', () => {
    const state = { ...createMatch(config), games: [3, 1] as [number, number] };
    const texts = renderTexts(state);

    expect(texts.indexOf('Irakli')).toBeLessThan(texts.indexOf('Rafael'));
    // Games are displayed left-then-right within the current set column
    expect(texts.indexOf('3')).toBeLessThan(texts.indexOf('1'));
  });

  test('mirrors names and scores when the court is swapped', () => {
    const state: MatchState = {
      ...createMatch(config),
      games: [3, 1] as [number, number],
      courtSide: 'swapped',
    };
    const texts = renderTexts(state);

    expect(texts.indexOf('Rafael')).toBeLessThan(texts.indexOf('Irakli'));
    expect(texts.indexOf('1')).toBeLessThan(texts.indexOf('3'));
  });

  // The bar used to badge one side as YOU, from a scoreKeeper setting. The phone
  // is a scoreboard and has no side: it gets passed around, and whoever holds it
  // is often not playing. Nothing on this bar should claim otherwise.
  test('claims no side as the viewer', () => {
    const state = { ...createMatch(config), games: [0, 0] as [number, number] };
    expect(renderTexts(state)).toEqual(['Irakli', '0', '–', '0', 'Rafael']);
  });

  test('mirrors completed set scores too', () => {
    const state: MatchState = {
      ...createMatch(config),
      completedSets: [[6, 4]],
      courtSide: 'swapped',
    };
    const texts = renderTexts(state);

    expect(texts.indexOf('4')).toBeLessThan(texts.indexOf('6'));
  });
});
