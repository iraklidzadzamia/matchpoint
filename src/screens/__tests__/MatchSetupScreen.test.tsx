import renderer, { act, ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../../hooks/useOrientation', () => ({ usePortraitOrientation: () => {} }));

import { MatchSetupScreen } from '../MatchSetupScreen';
import { MatchConfig } from '../../engine/types';
import { getSideNames } from '../../engine/scoring';

const baseConfig: MatchConfig = {
  sport: 'padel',
  format: 'doubles',
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
  side1: { player1: 'Side 1' },
  side2: { player1: 'Side 2' },
  servingFirst: 'side1',
};

// The screen loads the last match's names on mount, so every render has to
// flush that promise — otherwise it resolves after the test has torn down.
async function render(
  onStartMatch: (config: MatchConfig) => void = () => {}
): Promise<ReactTestRenderer> {
  let instance!: ReactTestRenderer;
  await act(async () => {
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

async function renderTexts(): Promise<string[]> {
  const instance = await render();
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
  test('falls back to plain side names, never a stitched pair', async () => {
    // Name fields start empty, so the selectors must not invent a partner
    const texts = await renderTexts();
    expect(texts.filter((s) => /^Side \d & /.test(s))).toEqual([]);
    expect(texts).toContain('Side 1');
    expect(texts).toContain('Side 2');
  });

  test('offers sport and format as named choices rather than checkboxes', async () => {
    const texts = await renderTexts();
    expect(texts).toContain('Tennis');
    expect(texts).toContain('Padel');
    expect(texts).toContain('Singles');
    expect(texts).toContain('Doubles');
    // The old "Custom Names" checkbox is gone; names are always editable
    expect(texts).not.toContain('Custom Names');
  });

  // Setting up a match used to ask which side you were on, so statistics could
  // be about "you". Statistics are now a row per player, so the question earns
  // nothing and the step is gone.
  test('does not ask which side you are on', async () => {
    const texts = await renderTexts();
    expect(texts).not.toContain('Which side are you on?');
    expect(texts).toContain('Who serves first?');
  });

  // The label fix alone was not enough: the invented partner also travelled
  // into the match config, and from there into the saved history.
  test('starts an unnamed doubles match with plain side names', async () => {
    let started: MatchConfig | undefined;
    const instance = await render((config) => {
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

  // A group that plays together every week should not retype itself weekly.
  test('remembers the names from the last match and offers them again', async () => {
    await AsyncStorage.clear();

    let started: MatchConfig | undefined;
    const first = await render((config) => {
      started = config;
    });

    const type = (instance: ReactTestRenderer, index: number, name: string) => {
      act(() => {
        instance.root.findAllByType(TextInput)[index].props.onChangeText(name);
      });
    };
    type(first, 0, 'Irakli');
    type(first, 1, 'Nika');
    type(first, 2, 'Rafael');
    type(first, 3, 'Juan');

    const pressStart = (instance: ReactTestRenderer) => {
      const pressables = instance.root.findAll(
        (node) => typeof node.props.onPress === 'function'
      );
      act(() => {
        pressables[pressables.length - 1].props.onPress();
      });
    };
    pressStart(first);
    expect(started!.side1).toEqual({ player1: 'Irakli', player2: 'Nika' });

    // A fresh mount, as if the app had been closed and reopened
    const second = await render();
    const values = second.root.findAllByType(TextInput).map((n) => n.props.value);
    expect(values).toEqual(['Irakli', 'Nika', 'Rafael', 'Juan']);
  });

  test('clearing every field leaves the remembered names alone', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(
      '@matchpoint_last_players',
      JSON.stringify({ side1: ['Irakli', 'Nika'], side2: ['Rafael', 'Juan'] })
    );

    let started: MatchConfig | undefined;
    const instance = await render((config) => {
      started = config;
    });

    // Wipe the pre-filled names, the way someone playing with strangers would
    const inputs = instance.root.findAllByType(TextInput);
    act(() => {
      inputs.forEach((input) => input.props.onChangeText(''));
    });

    const pressables = instance.root.findAll((node) => typeof node.props.onPress === 'function');
    act(() => {
      pressables[pressables.length - 1].props.onPress();
    });
    expect(started!.side1).toEqual({ player1: 'Side 1' });

    // An anonymous match must not erase what the last named one saved
    const raw = await AsyncStorage.getItem('@matchpoint_last_players');
    expect(JSON.parse(raw!).side1).toEqual(['Irakli', 'Nika']);
  });
});
