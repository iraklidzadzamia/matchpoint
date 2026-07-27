import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../hooks/useOrientation', () => ({ usePortraitOrientation: () => {} }));

import { MatchSetupScreen } from '../MatchSetupScreen';
import { MatchConfig } from '../../engine/types';

const baseConfig: MatchConfig = {
  sport: 'padel',
  format: 'doubles',
  totalSets: 3,
  tieBreakEnabled: true,
  matchTieBreakEnabled: false,
  tieBreakTo: 7,
  goldenPointEnabled: false,
  advantagesBeforeGolden: 1,
  swapSides: 'oddGames',
  side1: { player1: 'Side 1' },
  side2: { player1: 'Side 2' },
  servingFirst: 'side1',
  scoreKeeper: 'side1',
};

function renderTexts(): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <MatchSetupScreen
        sport="padel"
        baseConfig={baseConfig}
        onBack={() => {}}
        onStartMatch={() => {}}
        onOpenSettings={() => {}}
      />
    );
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

describe('MatchSetupScreen side labels', () => {
  test('never stitches a fallback pair like "Side 1 & Player 2"', () => {
    // Custom names default on, so the seeded names are used
    const texts = renderTexts();
    const stitched = texts.filter((s) => /^Side \d & /.test(s));
    expect(stitched).toEqual([]);
  });

  test('shows the entered pair names on the side selectors', () => {
    const texts = renderTexts();
    expect(texts).toContain('Irakli & Serena');
    expect(texts).toContain('Rafael & Venus');
  });

  test('asks which side you are on, not who keeps score', () => {
    const texts = renderTexts();
    expect(texts).toContain('Which side are you on?');
  });
});
