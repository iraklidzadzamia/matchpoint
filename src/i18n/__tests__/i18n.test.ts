import { t } from '../index';

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
