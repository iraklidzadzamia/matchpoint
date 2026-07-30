import { t, getScoreAnnouncement } from '../index';
import { createMatch, addPoint } from '../../engine/scoring';
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
  swapSides: 'off',
  side1: { player1: 'Irakli' },
  side2: { player1: 'Rafael' },
  servingFirst: 'side1',
};

describe('score announcements', () => {
  test('names both sides, server first', () => {
    let match = createMatch(config); // side1 serves
    match = addPoint(match, 'side1');
    expect(getScoreAnnouncement(match)).toBe('Fifteen, Love');

    match = addPoint(match, 'side2');
    match = addPoint(match, 'side2');
    // Server is still side1 on 15:30, so its score still leads
    expect(getScoreAnnouncement(match)).toBe('Fifteen, Thirty');
  });

  test('follows the serve when it changes hands', () => {
    let match = createMatch({ ...config, servingFirst: 'side2' });
    match = addPoint(match, 'side1');
    // side2 serves, so its Love is announced ahead of side1's Fifteen
    expect(getScoreAnnouncement(match)).toBe('Love, Fifteen');
  });

  test('uses "all" for level scores', () => {
    let match = createMatch(config);
    match = addPoint(match, 'side1');
    match = addPoint(match, 'side2');
    expect(getScoreAnnouncement(match)).toBe('Fifteen All');
  });

  // A hyphen gets read as "minus" or dropped, taking the second score with it.
  test('never separates the two scores with a dash', () => {
    let match = createMatch(config);
    for (const side of ['side1', 'side2', 'side1'] as const) {
      match = addPoint(match, side);
      expect(getScoreAnnouncement(match)).not.toContain('-');
    }
  });
});

describe('i18n', () => {
  test('returns the key path when a string is missing', () => {
    expect(t('ui.definitelyNotAKey')).toBe('ui.definitelyNotAKey');
  });

  // These are built with template strings in SettingsScreen, so TypeScript
  // cannot catch a typo — a missing key would render as raw "ui.deuce_tennis".
  test.each(['tennis', 'star', 'golden'])('deuce rule %s has a name and an explanation', (rule) => {
    expect(t(`ui.deuce_${rule}`)).not.toBe(`ui.deuce_${rule}`);
    expect(t(`ui.deuce_${rule}_hint`)).not.toBe(`ui.deuce_${rule}_hint`);
  });

  test('substitutes named parameters', () => {
    expect(t('score.gameWon', { name: 'Irakli' })).toBe('Game, Irakli!');
  });
});
