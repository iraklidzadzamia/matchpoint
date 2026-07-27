import renderer, { act, ReactTestRenderer } from 'react-test-renderer';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import { SettingsScreen } from '../SettingsScreen';
import { MatchConfig, AppSettings } from '../../engine/types';

const baseConfig: MatchConfig = {
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

const appSettings: AppSettings = {
  voiceAnnounce: true,
  liveCrowd: true,
  maxBrightness: true,
};

function renderTexts(config: MatchConfig): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <SettingsScreen
        visible
        config={config}
        appSettings={appSettings}
        onClose={() => {}}
        onUpdateConfig={() => {}}
        onUpdateAppSettings={() => {}}
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

describe('SettingsScreen deuce rule', () => {
  test('offers all three rules by name, each with an explanation', () => {
    const texts = renderTexts(baseConfig);

    expect(texts).toContain('Like in tennis');
    expect(texts).toContain('Star point');
    expect(texts).toContain('Golden point');

    // No option should be left as a bare label without saying what it does
    expect(texts).toContain('Win 2 points in a row to take the game. Advantages never run out.');
    expect(texts).toContain('The very next point wins the game. The usual choice in clubs.');

    // And no unresolved i18n key should leak into the UI
    expect(texts.filter((s) => s.startsWith('ui.'))).toEqual([]);
  });
});
