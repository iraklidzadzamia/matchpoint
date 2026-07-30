import { computeCareerStats, formatTotalTime } from '../careerStats';
import { MatchRecord } from '../types';

/** A finished match, described by only the parts these totals read. */
function record(over: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: String(Math.random()),
    sport: 'padel',
    format: 'doubles',
    side1Name: 'Irakli & Nika',
    side2Name: 'Rafael & Juan',
    setScores: [[6, 4], [6, 3]],
    setsWon: [2, 0],
    winner: 'side1',
    yourSide: 'side1',
    startedAt: 0,
    durationSec: 3600,
    pointLog: [],
    ...over,
  };
}

describe('career statistics', () => {
  test('an empty history reports nothing rather than zeroes it cannot know', () => {
    const stats = computeCareerStats([]);
    expect(stats.played).toBe(0);
    expect(stats.winRate).toBeNull();
    expect(stats.longestMatch).toBeNull();
    expect(formatTotalTime(stats.totalSec)).toBe('—');
  });

  test('counts wins from your side, not from side one', () => {
    const stats = computeCareerStats([
      record({ winner: 'side1', yourSide: 'side1' }),
      record({ winner: 'side1', yourSide: 'side2' }),
      record({ winner: 'side2', yourSide: 'side2' }),
    ]);
    expect(stats.played).toBe(3);
    expect(stats.won).toBe(2);
    expect(stats.lost).toBe(1);
    expect(stats.winRate).toBeCloseTo(2 / 3);
  });

  test('a match that never knew your side counts as played but not as won or lost', () => {
    const legacy = record();
    delete legacy.yourSide;

    const stats = computeCareerStats([record({ winner: 'side1', yourSide: 'side1' }), legacy]);
    expect(stats.played).toBe(2);
    expect(stats.ranked).toBe(1);
    expect(stats.won).toBe(1);
    expect(stats.lost).toBe(0);
    // One win out of one match it could judge — not one out of two.
    expect(stats.winRate).toBe(1);
  });

  test('opponents are tallied by the side that was not yours', () => {
    const stats = computeCareerStats([
      record({ yourSide: 'side1', winner: 'side1' }),
      record({ yourSide: 'side1', winner: 'side2' }),
      record({ yourSide: 'side2', side1Name: 'Sandro & Giorgi', winner: 'side2' }),
    ]);

    expect(stats.opponents[0]).toEqual({
      name: 'Rafael & Juan',
      played: 2,
      won: 1,
      lost: 1,
    });
    expect(stats.opponents[1]).toEqual({
      name: 'Sandro & Giorgi',
      played: 1,
      won: 1,
      lost: 0,
    });
  });

  test('the partner is the other name on your own side, and only in doubles', () => {
    const stats = computeCareerStats([
      record({ yourSide: 'side1', side1Name: 'Irakli & Nika' }),
      record({ yourSide: 'side1', side1Name: 'Irakli & Nika' }),
      record({ yourSide: 'side1', side1Name: 'Irakli & Luka' }),
      record({ format: 'singles', yourSide: 'side1', side1Name: 'Irakli' }),
    ]);

    expect(stats.partners.map((p) => [p.name, p.played])).toEqual([
      ['Nika', 2],
      ['Luka', 1],
    ]);
  });

  test('the streak counts back from the most recent match and stops at a loss', () => {
    // History is newest first.
    const stats = computeCareerStats([
      record({ winner: 'side1', yourSide: 'side1' }),
      record({ winner: 'side1', yourSide: 'side1' }),
      record({ winner: 'side2', yourSide: 'side1' }),
      record({ winner: 'side1', yourSide: 'side1' }),
    ]);
    expect(stats.currentStreak).toBe(2);
  });

  test('a match that cannot be judged does not break a streak', () => {
    const legacy = record();
    delete legacy.yourSide;

    const stats = computeCareerStats([
      record({ winner: 'side1', yourSide: 'side1' }),
      legacy,
      record({ winner: 'side1', yourSide: 'side1' }),
      record({ winner: 'side2', yourSide: 'side1' }),
    ]);
    expect(stats.currentStreak).toBe(2);
  });

  test('a loss in the latest match means no streak at all', () => {
    const stats = computeCareerStats([
      record({ winner: 'side2', yourSide: 'side1' }),
      record({ winner: 'side1', yourSide: 'side1' }),
    ]);
    expect(stats.currentStreak).toBe(0);
  });

  test('splits by sport, most played first', () => {
    const stats = computeCareerStats([
      record({ sport: 'padel', winner: 'side1', yourSide: 'side1' }),
      record({ sport: 'padel', winner: 'side2', yourSide: 'side1' }),
      record({ sport: 'tennis', winner: 'side1', yourSide: 'side1' }),
    ]);

    expect(stats.bySport).toEqual([
      { sport: 'padel', played: 2, won: 1, lost: 1 },
      { sport: 'tennis', played: 1, won: 1, lost: 0 },
    ]);
  });

  test('adds up time and points, and finds the longest match', () => {
    const long = record({ durationSec: 7200, id: 'long' });
    const stats = computeCareerStats([
      record({ durationSec: 1800, pointLog: [{ at: 0, winner: 'side1', type: 'point' }] }),
      long,
    ]);

    expect(stats.totalSec).toBe(9000);
    expect(stats.totalPoints).toBe(1);
    expect(stats.longestMatch?.id).toBe('long');
    expect(formatTotalTime(stats.totalSec)).toBe('2h 30m');
  });

  test('time reads in hours and minutes', () => {
    expect(formatTotalTime(45 * 60)).toBe('45m');
    expect(formatTotalTime(3600)).toBe('1h');
    expect(formatTotalTime(3600 + 20 * 60)).toBe('1h 20m');
  });
});
