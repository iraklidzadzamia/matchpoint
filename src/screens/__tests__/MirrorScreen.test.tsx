import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../hooks/useOrientation', () => ({ useLandscapeOrientation: () => {} }));
jest.mock('../../hooks/useMaxBrightness', () => ({ useMaxBrightness: () => {} }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => {} }));

import { MirrorScreen } from '../MirrorScreen';
import { createMatch } from '../../engine/scoring';
import { ConnectionState } from '../../link/protocol';
import { MatchConfig } from '../../engine/types';

const config: MatchConfig = {
  sport: 'tennis',
  format: 'singles',
  scoringMode: 'sets',
  pointsToWin: 21,
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

function render(connection: ConnectionState): ReactTestRenderer {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <MirrorScreen
        state={createMatch(config)}
        connection={connection}
        maxBrightness={false}
        onLeave={() => {}}
      />
    );
  });
  return instance;
}

function textsOf(instance: ReactTestRenderer): string[] {
  const texts: string[] = [];
  const walk = (node: any) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') return texts.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    if (node.children) node.children.forEach(walk);
  };
  walk(instance.toJSON());
  return texts;
}

describe('MirrorScreen', () => {
  // The reason a mirror is safe to hand to a spectator: there is nothing on it
  // that scores. Not disabled buttons — no buttons. Only leaving is a control.
  test('offers exactly one control, and it is leaving', () => {
    const touchables = render('connected').root.findAllByType(TouchableOpacity);

    expect(touchables).toHaveLength(1);
    expect(textsOf(render('connected'))).toContain('Stop');
  });

  test('shows the score as live while connected', () => {
    const texts = textsOf(render('connected'));

    expect(texts).toContain('Mirroring');
    expect(texts).not.toContain('Lost the scoreboard');
  });

  // The failure this guards against is silent: a mirror that keeps showing the
  // last score it received is indistinguishable from one that is up to date, and
  // the whole court plays on it.
  test('admits it when the scoreboard is gone', () => {
    const texts = textsOf(render('disconnected'));

    expect(texts).toContain('Lost the scoreboard');
    expect(texts.join(' ')).toContain('may be out of date');
  });

  test('says it is trying before it says it has lost', () => {
    const texts = textsOf(render('connecting'));

    expect(texts).toContain('Reconnecting');
    expect(texts.join(' ')).not.toContain('may be out of date');
  });

  test('dims the score whenever it is not live', () => {
    const zones = (instance: ReactTestRenderer) =>
      JSON.stringify(instance.toJSON()).includes('"opacity":0.35');

    expect(zones(render('connected'))).toBe(false);
    expect(zones(render('disconnected'))).toBe(true);
    expect(zones(render('connecting'))).toBe(true);
  });
});
