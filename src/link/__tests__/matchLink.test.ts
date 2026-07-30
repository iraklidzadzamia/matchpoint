import { MatchLink } from '../matchLink';
import { LoopbackNetwork, LoopbackTransport } from '../loopbackTransport';
import { matchCode, PeerInfo } from '../protocol';
import { createMatch, getDisplayScore } from '../../engine/scoring';
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
  goldenPointEnabled: true,
  advantagesBeforeGolden: 2,
  swapSides: 'off',
  side1: { player1: 'Irakli', player2: 'Nika' },
  side2: { player1: 'Rafael', player2: 'Juan' },
  servingFirst: 'side1',
};

/** A scoreboard and a second device on one network, not yet connected. */
function pair() {
  const network = new LoopbackNetwork();
  const scoreboard = new MatchLink(new LoopbackTransport(network, 'phone-a'), 'scoreboard');
  const display = new MatchLink(new LoopbackTransport(network, 'phone-b'), 'display');
  return { network, scoreboard, display };
}

describe('a second screen', () => {
  test('sees the score once it joins', async () => {
    const { scoreboard, display } = pair();
    let shown = '0-0';
    display.onState = (state) => {
      const score = getDisplayScore(state);
      shown = `${score.side1Score}-${score.side2Score}`;
    };

    const match = createMatch(config);
    await scoreboard.host(match, 'Irakli & Nika vs Rafael & Juan');
    await scoreboard.score('side1', 1);
    await scoreboard.score('side1', 2);

    // Nothing has reached the second phone yet — it is not connected.
    expect(shown).toBe('0-0');

    await display.join('phone-a');
    expect(shown).toBe('30-0');
  });

  test('follows every point after that', async () => {
    const { scoreboard, display } = pair();
    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    await scoreboard.score('side2', 1);
    expect(getDisplayScore(display.current!)).toEqual({ side1Score: '0', side2Score: '15' });

    await scoreboard.score('side2', 2);
    await scoreboard.score('side2', 3);
    await scoreboard.score('side2', 4);
    // A whole game to side 2.
    expect(display.current!.games).toEqual([0, 1]);
  });

  test('can score, and the scoreboard is the one that decides', async () => {
    const { scoreboard, display } = pair();
    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    await display.score('side1');

    // The point was applied once, by the scoreboard, and both agree.
    expect(scoreboard.current!.points).toEqual([1, 0]);
    expect(display.current!.points).toEqual([1, 0]);
  });

  test('a second screen cannot be talked into owning the match', async () => {
    const { network, scoreboard, display } = pair();
    const other = new MatchLink(new LoopbackTransport(network, 'phone-c'), 'display');

    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    // A stray point aimed at another display must not be applied by it.
    network.connect('phone-c', 'phone-b');
    await other.score('side1');
    expect(display.current!.points).toEqual([0, 0]);
  });

  test('the state that arrives is a copy, not the scoreboard own object', async () => {
    const { scoreboard, display } = pair();
    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');
    await scoreboard.score('side1', 1);

    expect(display.current).not.toBe(scoreboard.current);
    display.current!.points[0] = 99;
    expect(scoreboard.current!.points[0]).toBe(1);
  });
});

describe('choosing which phone', () => {
  test('a scoreboard is listed with its match and its code', async () => {
    const { scoreboard, display } = pair();
    let seen: PeerInfo[] = [];
    display.onPeers = (peers) => {
      seen = peers;
    };

    const match = createMatch(config);
    await scoreboard.host(match, 'Irakli & Nika vs Rafael & Juan');
    display.browse();

    expect(seen).toEqual([
      {
        id: 'phone-a',
        name: 'Irakli & Nika vs Rafael & Juan',
        code: matchCode(match.matchStartTime),
      },
    ]);
  });

  test('several courts each show up, and the code tells them apart', async () => {
    const network = new LoopbackNetwork();
    const courtOne = new MatchLink(new LoopbackTransport(network, 'court-1'), 'scoreboard');
    const courtTwo = new MatchLink(new LoopbackTransport(network, 'court-2'), 'scoreboard');
    const joiner = new MatchLink(new LoopbackTransport(network, 'joiner'), 'camera');

    // Two groups whose names genuinely match — the situation names alone cannot
    // resolve.
    const a = createMatch(config);
    const b = { ...createMatch(config), matchStartTime: a.matchStartTime + 60_000 };
    await courtOne.host(a, 'Irakli & Nika vs Rafael & Juan');
    await courtTwo.host(b, 'Irakli & Nika vs Rafael & Juan');

    let seen: PeerInfo[] = [];
    joiner.onPeers = (peers) => {
      seen = peers;
    };
    joiner.browse();

    expect(seen).toHaveLength(2);
    expect(seen[0].name).toBe(seen[1].name);
    expect(seen[0].code).not.toBe(seen[1].code);
  });

  test('a device does not list itself', async () => {
    const { scoreboard } = pair();
    let seen: PeerInfo[] = [];
    scoreboard.onPeers = (peers) => {
      seen = peers;
    };

    await scoreboard.host(createMatch(config), 'A vs B');
    scoreboard.browse();
    expect(seen).toEqual([]);
  });

  test('joining connects to the one chosen, not to whatever answered', async () => {
    const network = new LoopbackNetwork();
    const wanted = new MatchLink(new LoopbackTransport(network, 'wanted'), 'scoreboard');
    const other = new MatchLink(new LoopbackTransport(network, 'other'), 'scoreboard');
    const joiner = new MatchLink(new LoopbackTransport(network, 'joiner'), 'display');

    await wanted.host(createMatch(config), 'The one we want');
    await other.host(createMatch(config), 'Somebody else');

    await joiner.join('wanted');
    await wanted.score('side1', 1);
    await other.score('side2', 1);
    await other.score('side2', 2);

    // Only the chosen scoreboard's points arrived.
    expect(joiner.current!.points).toEqual([1, 0]);
  });

  test('a match keeps the same code across restarts', () => {
    const startedAt = 1785000000000;
    expect(matchCode(startedAt)).toBe(matchCode(startedAt));
    expect(matchCode(startedAt)).toHaveLength(4);
    expect(matchCode(startedAt)).not.toBe(matchCode(startedAt + 60_000));
  });
});

describe('a camera lining up its recording', () => {
  test('learns how far its clock is from the scoreboard', async () => {
    const network = new LoopbackNetwork();
    const scoreboard = new MatchLink(new LoopbackTransport(network, 'phone-a'), 'scoreboard');
    const camera = new MatchLink(new LoopbackTransport(network, 'phone-b'), 'camera');

    await scoreboard.host(createMatch(config), 'A vs B');
    await camera.join('phone-a');

    // Loopback has no latency, so the two clocks agree to the millisecond. What
    // matters is that an offset was worked out at all.
    expect(Math.abs(camera.clockOffset)).toBeLessThan(50);
  });
});
