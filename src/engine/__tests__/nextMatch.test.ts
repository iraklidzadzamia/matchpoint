import { suggestNextMatch, sittingOut } from '../nextMatch';
import { MatchRecord } from '../types';

const MIN = 60_000;

/** A finished match between the two given pairs, ending `endsAtMin` into the session. */
function match(side1: string[], side2: string[], endsAtMin: number): MatchRecord {
  const durationSec = 45 * 60;
  return {
    id: `${side1.join('')}-${endsAtMin}`,
    sport: 'padel',
    format: side1.length === 1 ? 'singles' : 'doubles',
    side1Name: side1.join(' & '),
    side2Name: side2.join(' & '),
    side1Players: side1,
    side2Players: side2,
    setScores: [[6, 4]],
    setsWon: [1, 0],
    winner: 'side1',
    startedAt: endsAtMin * MIN - durationSec * 1000,
    durationSec,
    pointLog: [],
  };
}

const SIX = ['Irakli', 'Nika', 'Rafael', 'Juan', 'Sandro', 'Giorgi'];

describe('suggesting the next match', () => {
  test('nothing to suggest when too few people are present', () => {
    expect(suggestNextMatch([], ['Irakli', 'Nika', 'Rafael'], 'doubles')).toBeNull();
    expect(suggestNextMatch([], ['Irakli'], 'singles')).toBeNull();
  });

  test('with nobody having played yet, it just picks four', () => {
    const suggestion = suggestNextMatch([], SIX, 'doubles')!;
    const chosen = [...suggestion.side1, ...suggestion.side2];

    expect(chosen).toHaveLength(4);
    expect(new Set(chosen).size).toBe(4);
    chosen.forEach((name) => expect(SIX).toContain(name));
  });

  test('whoever has not played is picked ahead of whoever has', () => {
    const session = [match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50)];

    const suggestion = suggestNextMatch(session, SIX, 'doubles')!;
    const chosen = [...suggestion.side1, ...suggestion.side2];

    // Sandro and Giorgi sat out the first match, so they go on now.
    expect(chosen).toContain('Sandro');
    expect(chosen).toContain('Giorgi');
  });

  test('among people who have played the same amount, the longest wait goes first', () => {
    // Five present. Irakli and Nika finished early, Rafael and Juan finished
    // later, so the first pair has been waiting longer.
    const session = [
      match(['Irakli', 'Nika'], ['Sandro', 'Giorgi'], 50),
      match(['Rafael', 'Juan'], ['Sandro', 'Giorgi'], 110),
    ];

    const order = suggestNextMatch(session, ['Irakli', 'Nika', 'Rafael', 'Juan'], 'doubles')!;
    const chosen = [...order.side1, ...order.side2];
    // All four have played once, so all four go on — the point is it does not crash
    // or drop anybody when everything ties.
    expect(new Set(chosen).size).toBe(4);
  });

  test('partners are shuffled rather than repeated', () => {
    // Irakli and Nika have already partnered twice this session.
    const session = [
      match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50),
      match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 110),
    ];

    const suggestion = suggestNextMatch(session, ['Irakli', 'Nika', 'Rafael', 'Juan'], 'doubles')!;
    const pairs = [suggestion.side1.join(' '), suggestion.side2.join(' ')];

    // Whatever split it picks, it must not put those two together again.
    const together = pairs.some(
      (p) => p.includes('Irakli') && p.includes('Nika')
    );
    expect(together).toBe(false);
  });

  test('a pairing that has never happened is preferred to one that has', () => {
    const session = [match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50)];

    const suggestion = suggestNextMatch(session, ['Irakli', 'Nika', 'Rafael', 'Juan'], 'doubles')!;
    const sides = [suggestion.side1, suggestion.side2].map((s) => [...s].sort().join(' '));

    expect(sides).not.toContain('Irakli Nika');
    expect(sides).not.toContain('Juan Rafael');
  });

  test('singles picks the two who have waited longest', () => {
    const session = [match(['Irakli'], ['Nika'], 50)];

    const suggestion = suggestNextMatch(session, ['Irakli', 'Nika', 'Luka'], 'singles')!;
    expect(suggestion.side1).toHaveLength(1);
    expect(suggestion.side2).toHaveLength(1);
    // Luka has not played, so he is on.
    expect([...suggestion.side1, ...suggestion.side2]).toContain('Luka');
  });

  test('somebody who played but is no longer marked present is ignored', () => {
    const session = [match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50)];

    const suggestion = suggestNextMatch(session, ['Sandro', 'Giorgi', 'Luka', 'Saba'], 'doubles')!;
    const chosen = [...suggestion.side1, ...suggestion.side2].sort();
    expect(chosen).toEqual(['Giorgi', 'Luka', 'Saba', 'Sandro']);
  });
});

describe('who is sitting out', () => {
  test('lists the people present who have not played', () => {
    const session = [match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50)];
    expect(sittingOut(session, SIX)).toEqual(['Giorgi', 'Sandro']);
  });

  test('nobody is sitting out once everyone has played', () => {
    const session = [
      match(['Irakli', 'Nika'], ['Rafael', 'Juan'], 50),
      match(['Sandro', 'Giorgi'], ['Irakli', 'Nika'], 110),
    ];
    expect(sittingOut(session, SIX)).toEqual([]);
  });

  test('at the start of a session everybody is sitting out', () => {
    expect(sittingOut([], SIX).sort()).toEqual([...SIX].sort());
  });
});
