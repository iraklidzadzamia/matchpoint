import { computeGroupStats, countRotation, formatTotalTime } from '../groupStats';
import { MatchRecord, PointRecord } from '../types';

/** A finished doubles match, described by only the parts these totals read. */
function record(over: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: String(Math.random()),
    sport: 'padel',
    format: 'doubles',
    side1Name: 'Irakli & Nika',
    side2Name: 'Rafael & Juan',
    side1Players: ['Irakli', 'Nika'],
    side2Players: ['Rafael', 'Juan'],
    setScores: [[6, 4]],
    setsWon: [1, 0],
    winner: 'side1',
    startedAt: 0,
    durationSec: 3600,
    pointLog: [],
    ...over,
  };
}

/** `winners` describes the points; `servers` who served each of them. */
function log(winners: string, servers?: string): PointRecord[] {
  return [...winners].map((w, i) => {
    const point: PointRecord = {
      at: i * 1000,
      winner: w === '1' ? 'side1' : 'side2',
      type: 'point',
    };
    if (servers) {
      point.served = servers[i] === '1' ? 'side1' : 'side2';
      point.servedByPlayer = 0;
    }
    return point;
  });
}

describe('group statistics', () => {
  test('an empty history has no players', () => {
    expect(computeGroupStats([])).toEqual({
      players: [],
      matchesCounted: 0,
      matchesSkipped: 0,
      totalSec: 0,
    });
  });

  test('every player on a side gets the match and its result', () => {
    const { players } = computeGroupStats([record({ winner: 'side1' })]);

    expect(players.map((p) => [p.name, p.played, p.won, p.lost])).toEqual([
      ['Irakli', 1, 1, 0],
      ['Juan', 1, 0, 1],
      ['Nika', 1, 1, 0],
      ['Rafael', 1, 0, 1],
    ]);
  });

  test('a player is followed across changing partners', () => {
    const { players } = computeGroupStats([
      record({ side1Players: ['Irakli', 'Nika'], winner: 'side1' }),
      record({ side1Players: ['Irakli', 'Rafael'], side2Players: ['Nika', 'Juan'], winner: 'side2' }),
      record({ side1Players: ['Irakli', 'Juan'], side2Players: ['Nika', 'Rafael'], winner: 'side1' }),
    ]);

    const irakli = players.find((p) => p.name === 'Irakli')!;
    expect([irakli.played, irakli.won, irakli.lost]).toEqual([3, 2, 1]);

    const nika = players.find((p) => p.name === 'Nika')!;
    expect([nika.played, nika.won, nika.lost]).toEqual([3, 2, 1]);
  });

  test('points are credited to both players of a side', () => {
    // Side 1 took four of the six points played.
    const { players } = computeGroupStats([record({ pointLog: log('112121') })]);

    const irakli = players.find((p) => p.name === 'Irakli')!;
    expect([irakli.pointsWon, irakli.pointsPlayed]).toEqual([4, 6]);

    const juan = players.find((p) => p.name === 'Juan')!;
    expect([juan.pointsWon, juan.pointsPlayed]).toEqual([2, 6]);
  });

  test('serve is credited to the individual who served, not to the side', () => {
    // Six points. Side 1 serves the first three and holds all of them; side 2
    // serves the last three and wins only the last. Player index 0 on each side
    // does the serving, so the numbers land on Irakli and Rafael.
    const { players } = computeGroupStats([record({ pointLog: log('111112', '111222') })]);

    const irakli = players.find((p) => p.name === 'Irakli')!;
    expect([irakli.servePointsPlayed, irakli.servePointsWon]).toEqual([3, 3]);

    // Nika was on court for all of it but served none of it.
    const nika = players.find((p) => p.name === 'Nika')!;
    expect([nika.servePointsPlayed, nika.servePointsWon]).toEqual([0, 0]);

    const rafael = players.find((p) => p.name === 'Rafael')!;
    expect([rafael.servePointsPlayed, rafael.servePointsWon]).toEqual([3, 1]);

    // Serving three points is not the same as playing them: everyone played six.
    expect(players.every((p) => p.pointsPlayed === 6)).toBe(true);
  });

  test('a serving index pointing past the end of a side is ignored', () => {
    // A doubles config with a blank partner can log servedByPlayer: 1.
    const points = log('11');
    points[0].served = 'side1';
    points[0].servedByPlayer = 1;
    points[1].served = 'side1';
    points[1].servedByPlayer = 1;

    const { players } = computeGroupStats([
      record({ side1Players: ['Irakli'], format: 'singles', pointLog: points }),
    ]);
    expect(players.every((p) => p.servePointsPlayed === 0)).toBe(true);
  });

  test('a match that never recorded its players is skipped, not guessed', () => {
    const legacy = record();
    delete legacy.side1Players;
    delete legacy.side2Players;

    const stats = computeGroupStats([record(), legacy]);
    expect(stats.matchesCounted).toBe(1);
    expect(stats.matchesSkipped).toBe(1);
    // Nobody is invented out of "Irakli & Nika".
    expect(stats.players.every((p) => p.played === 1)).toBe(true);
    // And its hour on court is not counted either.
    expect(stats.totalSec).toBe(3600);
  });

  test('players are ordered by matches played', () => {
    const { players } = computeGroupStats([
      record({ side1Players: ['Irakli', 'Nika'] }),
      record({ side1Players: ['Irakli', 'Nika'] }),
      record({ side1Players: ['Sandro', 'Giorgi'] }),
    ]);

    expect(players[0].played).toBe(3);
    expect(players.slice(0, 2).map((p) => p.name).sort()).toEqual(['Juan', 'Rafael']);
    expect(players[players.length - 1].played).toBe(1);
  });

  test('singles works the same way', () => {
    const { players } = computeGroupStats([
      record({
        format: 'singles',
        side1Players: ['Irakli'],
        side2Players: ['Luka'],
        winner: 'side2',
      }),
    ]);

    expect(players.map((p) => [p.name, p.won, p.lost])).toEqual([
      ['Irakli', 0, 1],
      ['Luka', 1, 0],
    ]);
  });
});

describe('rotation', () => {
  test('whoever has played least comes first', () => {
    const session = [
      record({ side1Players: ['Irakli', 'Nika'], side2Players: ['Rafael', 'Juan'] }),
      record({ side1Players: ['Irakli', 'Rafael'], side2Players: ['Nika', 'Juan'] }),
    ];

    const rows = countRotation(session, ['Irakli', 'Nika', 'Rafael', 'Juan', 'Sandro', 'Giorgi']);
    expect(rows.slice(0, 2)).toEqual([
      { name: 'Giorgi', played: 0 },
      { name: 'Sandro', played: 0 },
    ]);
    expect(rows.slice(2).every((r) => r.played === 2)).toBe(true);
  });

  test('somebody who played but is not marked present is not counted', () => {
    const session = [record({ side1Players: ['Irakli', 'Nika'] })];
    const rows = countRotation(session, ['Irakli', 'Sandro']);

    expect(rows).toEqual([
      { name: 'Sandro', played: 0 },
      { name: 'Irakli', played: 1 },
    ]);
  });

  test('nobody present means no rows', () => {
    expect(countRotation([record()], [])).toEqual([]);
  });
});

describe('total time', () => {
  test('reads in hours and minutes', () => {
    expect(formatTotalTime(0)).toBe('—');
    expect(formatTotalTime(45 * 60)).toBe('45m');
    expect(formatTotalTime(3600)).toBe('1h');
    expect(formatTotalTime(3600 + 20 * 60)).toBe('1h 20m');
  });
});
