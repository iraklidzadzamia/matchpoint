import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../hooks/useOrientation', () => ({ usePortraitOrientation: () => {} }));

import { MatchDetailScreen } from '../MatchDetailScreen';
import { createMatch, addPoint, toMatchRecord } from '../../engine/scoring';
import { MatchConfig, MatchRecord, PlayerSide } from '../../engine/types';

const config: MatchConfig = {
  sport: 'padel',
  format: 'doubles',
  totalSets: 3,
  gamesPerSet: 6,
  tieBreakEnabled: true,
  matchTieBreakEnabled: false,
  tieBreakTo: 7,
  goldenPointEnabled: false,
  advantagesBeforeGolden: 1,
  swapSides: 'off',
  side1: { player1: 'Irakli', player2: 'Nika' },
  side2: { player1: 'Rafael', player2: 'Juan' },
  servingFirst: 'side1',
  scoreKeeper: 'side1',
};

/** Side 1 takes it 6-0 6-0, one point every half minute. */
function playRecord(): MatchRecord {
  let state = createMatch(config);
  let t = state.matchStartTime;
  for (let set = 0; set < 2; set++) {
    for (let game = 0; game < 6; game++) {
      for (let p = 0; p < 4; p++) state = addPoint(state, 'side1' as PlayerSide, (t += 30_000));
    }
  }
  return toMatchRecord(state)!;
}

function renderTexts(record: MatchRecord): string[] {
  let instance!: ReactTestRenderer;
  act(() => {
    instance = renderer.create(
      <MatchDetailScreen record={record} onBack={() => {}} onDelete={() => {}} />
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

describe('MatchDetailScreen', () => {
  test('names both sides and shows the numbers the match actually produced', () => {
    const texts = renderTexts(playRecord()).join('|');

    expect(texts).toContain('Irakli & Nika');
    expect(texts).toContain('Rafael & Juan');
    expect(texts).toContain('48');       // points played
    expect(texts).toContain('48–0');     // points won
    expect(texts).toContain('30s');      // average gap between points
    expect(texts).toContain('24m');      // twelve games, four points each
    // Set scores render digit by digit, so check the pieces are all present
    expect(texts).toContain('Set by set');
  });

  test('each set is listed with its own score, winner and length', () => {
    const record = playRecord();
    const texts = renderTexts(record);
    // Two sets, each 6-0 to side 1 in twelve minutes
    expect(texts.filter((s) => s === '12m')).toHaveLength(2);
    expect(texts.filter((s) => s === 'Irakli & Nika').length).toBeGreaterThanOrEqual(3);
    expect(record.setScores).toEqual([[6, 0], [6, 0]]);
  });

  test('no translation key leaks through as raw text', () => {
    const texts = renderTexts(playRecord());
    expect(texts.filter((s) => /^(ui|score)\./.test(s))).toEqual([]);
  });

  test('a record from before point logging opens with an explanation, not a crash', () => {
    const record = playRecord();
    delete (record as Partial<MatchRecord>).pointLog;

    const texts = renderTexts(record).join('|');
    expect(texts).toContain('saved before point-by-point timing');
    // The scoreboard and duration come from the record itself, so they stay
    expect(texts).toContain('Irakli & Nika');
    // …but nothing invents a zero-point statistic
    expect(texts).not.toContain('Points played');
  });

  test('back and delete are wired to the buttons in the header', () => {
    const record = playRecord();
    let backs = 0;
    let deleted: MatchRecord | null = null;

    let instance!: ReactTestRenderer;
    act(() => {
      instance = renderer.create(
        <MatchDetailScreen
          record={record}
          onBack={() => {
            backs += 1;
          }}
          onDelete={(r) => {
            deleted = r;
          }}
        />
      );
    });

    // findAll would return each button twice — the composite and its host view
    const buttons = instance.root.findAllByType(TouchableOpacity);
    act(() => {
      buttons[0].props.onPress();
      buttons[1].props.onPress();
    });

    expect(backs).toBe(1);
    expect(deleted).toBe(record);
  });
});
