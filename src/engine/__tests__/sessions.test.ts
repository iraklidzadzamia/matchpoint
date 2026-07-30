import { groupIntoSessions, sessionDayLabel, DEFAULT_SESSION_GAP_SEC } from '../sessions';
import { MatchRecord } from '../types';

const HOUR = 3600_000;
const LABELS = { today: 'Today', yesterday: 'Yesterday' };

/** A match starting at `startedAt` and running `minutes`. */
function record(startedAt: number, minutes = 45, over: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: String(startedAt),
    sport: 'padel',
    format: 'doubles',
    side1Name: 'Irakli & Nika',
    side2Name: 'Rafael & Juan',
    setScores: [[6, 4], [6, 3]],
    setsWon: [2, 0],
    winner: 'side1',
    yourSide: 'side1',
    startedAt,
    durationSec: minutes * 60,
    pointLog: [],
    ...over,
  };
}

describe('sessions', () => {
  test('no history means no sessions', () => {
    expect(groupIntoSessions([])).toEqual([]);
  });

  test('matches played back to back are one session', () => {
    const base = 10 * HOUR;
    // Three 45-minute matches, ten minutes between each.
    const history = [
      record(base + 2 * (55 * 60_000)),
      record(base + 55 * 60_000),
      record(base),
    ];

    const sessions = groupIntoSessions(history);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].played).toBe(3);
    expect(sessions[0].startedAt).toBe(base);
  });

  test('a long break starts a new session', () => {
    // Morning, then again in the evening — eight hours apart.
    const history = [record(20 * HOUR), record(10 * HOUR)];

    const sessions = groupIntoSessions(history);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].startedAt).toBe(20 * HOUR);
    expect(sessions[1].startedAt).toBe(10 * HOUR);
  });

  test('the gap is measured from the end of a match, not its start', () => {
    // Starts are 3h10m apart, but the first match ran two hours, so only 70
    // minutes of actual break separates them. That is one session.
    const history = [record(13 * HOUR + 10 * 60_000, 45), record(10 * HOUR, 120)];
    expect(groupIntoSessions(history)).toHaveLength(1);
  });

  test('a session running past midnight is not split by the calendar', () => {
    const beforeMidnight = new Date(2026, 6, 30, 23, 30).getTime();
    const afterMidnight = new Date(2026, 6, 31, 0, 25).getTime();

    const sessions = groupIntoSessions([record(afterMidnight, 40), record(beforeMidnight, 40)]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].played).toBe(2);
  });

  test('wins and losses are counted per session, from your own side', () => {
    const base = 10 * HOUR;
    const history = [
      record(base + 2 * (55 * 60_000), 45, { winner: 'side2', yourSide: 'side1' }),
      record(base + 55 * 60_000, 45, { winner: 'side2', yourSide: 'side2' }),
      record(base, 45, { winner: 'side1', yourSide: 'side1' }),
    ];

    const [session] = groupIntoSessions(history);
    expect(session.won).toBe(2);
    expect(session.lost).toBe(1);
  });

  test('a match that never knew your side is played but not judged', () => {
    const legacy = record(10 * HOUR);
    delete legacy.yourSide;

    const [session] = groupIntoSessions([record(11 * HOUR), legacy]);
    expect(session.played).toBe(2);
    expect(session.won).toBe(1);
    expect(session.lost).toBe(0);
  });

  test('elapsed time spans the whole outing, breaks included', () => {
    const base = 10 * HOUR;
    // First match 10:00–10:45, second 11:00–11:45. Elapsed is 1h45m, not 1h30m.
    const history = [record(base + HOUR, 45), record(base, 45)];

    const [session] = groupIntoSessions(history);
    expect(session.elapsedSec).toBe(105 * 60);
  });

  test('the default gap is three hours', () => {
    expect(DEFAULT_SESSION_GAP_SEC).toBe(10800);

    const justInside = [record(10 * HOUR + 45 * 60_000 + 3 * HOUR, 45), record(10 * HOUR, 45)];
    expect(groupIntoSessions(justInside)).toHaveLength(1);

    const justOutside = [
      record(10 * HOUR + 45 * 60_000 + 3 * HOUR + 60_000, 45),
      record(10 * HOUR, 45),
    ];
    expect(groupIntoSessions(justOutside)).toHaveLength(2);
  });

  describe('day label', () => {
    const now = new Date(2026, 6, 30, 12, 0).getTime();

    test('says today and yesterday rather than a date', () => {
      expect(sessionDayLabel(new Date(2026, 6, 30, 9, 0).getTime(), LABELS, now)).toBe('Today');
      expect(sessionDayLabel(new Date(2026, 6, 29, 20, 0).getTime(), LABELS, now)).toBe(
        'Yesterday'
      );
    });

    test('this morning counts as today even at one minute past midnight', () => {
      expect(sessionDayLabel(new Date(2026, 6, 30, 0, 1).getTime(), LABELS, now)).toBe('Today');
    });

    test('anything older gets a date', () => {
      const label = sessionDayLabel(new Date(2026, 6, 20).getTime(), LABELS, now);
      expect(label).not.toBe('Today');
      expect(label).not.toBe('Yesterday');
      expect(label).toMatch(/20/);
    });
  });
});
