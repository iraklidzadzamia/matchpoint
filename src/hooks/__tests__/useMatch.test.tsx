import renderer, { act } from 'react-test-renderer';

jest.mock('../../audio/audioQueue', () => ({
  audioQueue: {
    handlePointEvent: jest.fn(async () => {}),
    handleUndo: jest.fn(async () => {}),
  },
}));

import { useMatch } from '../useMatch';
import { MatchConfig } from '../../engine/types';

const config: MatchConfig = {
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
  swapSides: 'off',
  side1: { player1: 'Irakli', player2: 'Nika' },
  side2: { player1: 'Rafael', player2: 'Juan' },
  servingFirst: 'side1',
};

/** Renders the hook and keeps a handle on its latest return value. */
async function mount() {
  const seen = { api: null as ReturnType<typeof useMatch> | null };

  function Harness() {
    seen.api = useMatch();
    return null;
  }

  await act(async () => {
    renderer.create(<Harness />);
  });

  return seen as { api: ReturnType<typeof useMatch> };
}

// Every handler used to read the match out of its closure — a value from the
// last render. Two calls arriving before React draws again both read the same
// match, and the second overwrote the first. A finger rarely manages it. A watch
// firing asynchronously into the same door will, and the symptom is a point that
// simply never happened.
describe('the door every change goes through', () => {
  test('loses nothing when two points arrive before a render', async () => {
    const match = await mount();
    await act(async () => {
      await match.api.startNewMatch(config);
    });

    await act(async () => {
      // Deliberately not awaited one after the other: this is the shape of two
      // taps in the same tick, or a tap and a remote arriving together.
      const first = match.api.addPoint('side1');
      const second = match.api.addPoint('side1');
      await Promise.all([first, second]);
    });

    expect(match.api.matchState!.points).toEqual([2, 0]);
    expect(match.api.matchState!.pointLog).toHaveLength(2);
  });

  test('gives the two points different names', async () => {
    const match = await mount();
    await act(async () => {
      await match.api.startNewMatch(config);
    });

    await act(async () => {
      await Promise.all([match.api.addPoint('side1'), match.api.addPoint('side2')]);
    });

    const [a, b] = match.api.matchState!.pointLog;
    expect(a.id).toBeDefined();
    expect(a.id).not.toBe(b.id);
  });

  test('an undo racing a point still leaves the match consistent', async () => {
    const match = await mount();
    await act(async () => {
      await match.api.startNewMatch(config);
      await match.api.addPoint('side1');
    });

    await act(async () => {
      await Promise.all([match.api.addPoint('side1'), match.api.undo()]);
    });

    // Whichever order they ran in, the log and the score agree — which is the
    // property that a read-modify-write race destroys.
    const state = match.api.matchState!;
    expect(state.points[0]).toBe(state.pointLog.length);
  });
});
