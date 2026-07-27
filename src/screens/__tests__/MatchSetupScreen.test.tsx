import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../hooks/useOrientation', () => ({ usePortraitOrientation: () => {} }));

import { MatchSetupScreen } from '../MatchSetupScreen';
import { MatchConfig } from '../../engine/types';
import { getSideNames } from '../../engine/scoring';

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

function render(onStartMatch: (config: MatchConfig) => void = () => {}): ReactTestRenderer {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <MatchSetupScreen
        baseConfig={baseConfig}
        onBack={() => {}}
        onStartMatch={onStartMatch}
        onOpenSettings={() => {}}
      />
    );
  });
  return instance;
}

function renderTexts(): string[] {
  const instance = render();
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

describe('MatchSetupScreen', () => {
  test('falls back to plain side names, never a stitched pair', () => {
    // Name fields start empty, so the selectors must not invent a partner
    const texts = renderTexts();
    expect(texts.filter((s) => /^Side \d & /.test(s))).toEqual([]);
    expect(texts).toContain('Side 1');
    expect(texts).toContain('Side 2');
  });

  test('offers sport and format as named choices rather than checkboxes', () => {
    const texts = renderTexts();
    expect(texts).toContain('Tennis');
    expect(texts).toContain('Padel');
    expect(texts).toContain('Singles');
    expect(texts).toContain('Doubles');
    // The old "Custom Names" checkbox is gone; names are always editable
    expect(texts).not.toContain('Custom Names');
  });

  test('asks which side you are on, not who keeps score', () => {
    const texts = renderTexts();
    expect(texts).toContain('Which side are you on?');
  });

  // The label fix alone was not enough: the invented partner also travelled
  // into the match config, and from there into the saved history.
  test('starts an unnamed doubles match with plain side names', () => {
    let started: MatchConfig | undefined;
    const instance = render((config) => {
      started = config;
    });

    const startButton = instance.root.findAll(
      (node) => node.props.accessibilityRole === 'button' || typeof node.props.onPress === 'function'
    );
    // The Start Match button is the last pressable on the screen
    act(() => {
      startButton[startButton.length - 1].props.onPress();
    });

    expect(started).toBeDefined();
    expect(started!.side1).toEqual({ player1: 'Side 1' });
    expect(started!.side2).toEqual({ player1: 'Side 2' });
    expect(getSideNames(started!, 'side1')).toBe('Side 1');
    expect(getSideNames(started!, 'side2')).toBe('Side 2');
  });
});
