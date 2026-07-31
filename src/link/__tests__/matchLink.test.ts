import { MatchLink } from '../matchLink';
import { LoopbackNetwork, LoopbackTransport } from '../loopbackTransport';
import { matchCode, PeerInfo } from '../protocol';
import { addPoint, createMatch, getDisplayScore } from '../../engine/scoring';
import { MatchConfig, PlayerSide } from '../../engine/types';

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

const opened: MatchLink[] = [];

/**
 * Builds a link and remembers it. Hosting runs a heartbeat and a mirror runs a
 * silence timer, and both live until the link is left — a test that forgot would
 * hold the whole run open rather than fail, which is a miserable way to find out.
 */
function link(transport: LoopbackTransport, ownership: 'host' | 'guest'): MatchLink {
  const created = new MatchLink(transport, ownership);
  opened.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(opened.splice(0).map((created) => created.leave()));
});

/**
 * Plays the part the app's funnel plays on the scoreboard: run the engine once,
 * then publish the result.
 *
 * Spelled out in the tests rather than hidden inside `MatchLink` because keeping
 * it out of the link is the entire point. A point applied inside the link would
 * skip saving the match, the undo stack, the history, the sound and the rally
 * recorder — the score would move and nothing else would happen.
 */
async function scorePoint(host: MatchLink, winner: PlayerSide, at: number) {
  await host.publish(addPoint(host.current!, winner, at));
}

/** A scoreboard and a second device on one network, not yet connected. */
function pair() {
  const network = new LoopbackNetwork();
  const scoreboard = link(new LoopbackTransport(network, 'phone-a'), 'host');
  const display = link(new LoopbackTransport(network, 'phone-b'), 'guest');
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
    await scorePoint(scoreboard, 'side1', 1);
    await scorePoint(scoreboard, 'side1', 2);

    // Nothing has reached the second phone yet — it is not connected.
    expect(shown).toBe('0-0');

    await display.join('phone-a');
    expect(shown).toBe('30-0');
  });

  test('follows every point after that', async () => {
    const { scoreboard, display } = pair();
    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    await scorePoint(scoreboard, 'side2', 1);
    expect(getDisplayScore(display.current!)).toEqual({ side1Score: '0', side2Score: '15' });

    await scorePoint(scoreboard, 'side2', 2);
    await scorePoint(scoreboard, 'side2', 3);
    await scorePoint(scoreboard, 'side2', 4);
    // A whole game to side 2.
    expect(display.current!.games).toEqual([0, 1]);
  });

  // The link's job is to carry the request, and to stop there. Scoring it here
  // would bypass the app entirely: no saved match, no undo, no history, no
  // sound, no clip. The score would move and nothing else would happen.
  test('a request from a second screen is handed up, not acted on', async () => {
    const { scoreboard, display } = pair();
    const asked: PlayerSide[] = [];
    scoreboard.onPointRequest = (winner) => asked.push(winner);

    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    await display.score('side1');

    expect(asked).toEqual(['side1']);
    expect(scoreboard.current!.points).toEqual([0, 0]);
  });

  test('and once the app does score it, both agree', async () => {
    const { scoreboard, display } = pair();
    scoreboard.onPointRequest = (winner) => void scorePoint(scoreboard, winner, 1);

    await scoreboard.host(createMatch(config), 'A vs B');
    await display.join('phone-a');

    await display.score('side1');

    expect(scoreboard.current!.points).toEqual([1, 0]);
    expect(display.current!.points).toEqual([1, 0]);
  });

  test('a second screen cannot be talked into owning the match', async () => {
    const { network, scoreboard, display } = pair();
    const other = link(new LoopbackTransport(network, 'phone-c'), 'guest');

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
    await scorePoint(scoreboard, 'side1', 1);

    expect(display.current).not.toBe(scoreboard.current);
    display.current!.points[0] = 99;
    expect(scoreboard.current!.points[0]).toBe(1);
  });
});

// The native side used to discard these with `try?`. Nothing upstairs can
// usefully block on a radio, so the send is still fired and forgotten — but
// forgotten is not the same as unseen.
describe('a send that cannot go out', () => {
  test('is reported rather than swallowed', async () => {
    const network = new LoopbackNetwork();
    const transport = new LoopbackTransport(network, 'phone-a');
    transport.send = async () => {
      throw new Error('radio off');
    };

    const scoreboard = link(transport, 'host');
    const seen: unknown[] = [];
    scoreboard.onSendError = (error) => seen.push(error);

    await scoreboard.host(createMatch(config), 'A vs B');
    await scorePoint(scoreboard, 'side1', 1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(seen).toHaveLength(1);
    expect((seen[0] as Error).message).toBe('radio off');
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
    const courtOne = link(new LoopbackTransport(network, 'court-1'), 'host');
    const courtTwo = link(new LoopbackTransport(network, 'court-2'), 'host');
    const joiner = link(new LoopbackTransport(network, 'joiner'), 'guest');

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
    const wanted = link(new LoopbackTransport(network, 'wanted'), 'host');
    const other = link(new LoopbackTransport(network, 'other'), 'host');
    const joiner = link(new LoopbackTransport(network, 'joiner'), 'guest');

    await wanted.host(createMatch(config), 'The one we want');
    await other.host(createMatch(config), 'Somebody else');

    await joiner.join('wanted');
    await scorePoint(wanted, 'side1', 1);
    await scorePoint(other, 'side2', 1);
    await scorePoint(other, 'side2', 2);

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

// A connection can stay open long after the far end is gone, so a mirror cannot
// wait for the transport to admit it. It listens for silence instead.
describe('a mirror listening for the scoreboard', () => {
  test('stays quiet through a long gap between points', async () => {
    jest.useFakeTimers();
    try {
      const { scoreboard, display } = pair();
      const told: boolean[] = [];
      display.onTrust = (trusted) => told.push(trusted);

      await scoreboard.host(createMatch(config), 'A vs B');
      await display.join('phone-a');

      // Far longer than the silence threshold, and not a single point scored in
      // it — exactly the stretch that must not be mistaken for a fault.
      jest.advanceTimersByTime(30_000);

      expect(told).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('says so once the scoreboard goes quiet', async () => {
    jest.useFakeTimers();
    try {
      const { scoreboard, display } = pair();
      const told: boolean[] = [];
      display.onTrust = (trusted) => told.push(trusted);

      await scoreboard.host(createMatch(config), 'A vs B');
      await display.join('phone-a');

      jest.advanceTimersByTime(4000);
      expect(told).toEqual([]);

      // The phone keeping score vanishes: no goodbye, just nothing more.
      await scoreboard.leave();

      // One missed beat is not enough to shout about.
      jest.advanceTimersByTime(3000);
      expect(told).toEqual([]);

      jest.advanceTimersByTime(6000);
      expect(told).toEqual([false]);
    } finally {
      jest.useRealTimers();
    }
  });

  // The failure that hearing alone cannot catch, and the nastier one: every beat
  // arrives, so the mirror looks healthy, while the message that actually
  // mattered was lost. The bias is real — the state is large and grows through a
  // match, the beat is a few bytes, and this app deliberately drops anything it
  // cannot parse.
  test('knows it is behind even while the beats keep arriving', async () => {
    jest.useFakeTimers();
    try {
      const { network, scoreboard, display } = pair();
      const told: boolean[] = [];
      display.onTrust = (trusted) => told.push(trusted);

      await scoreboard.host(createMatch(config), 'A vs B');
      await display.join('phone-a');

      // From here the score gets through to nobody, but the scoreboard is alive
      // and saying so on schedule.
      network.dropIf = (message) => message.kind === 'state';
      await scorePoint(scoreboard, 'side1', 1);

      jest.advanceTimersByTime(10_000);

      expect(told).toEqual([false]);
      // Still being heard the whole time — this is not silence.
      expect(display.current!.points).toEqual([0, 0]);
    } finally {
      jest.useRealTimers();
    }
  });

  test('catches up by itself once the score can get through again', async () => {
    jest.useFakeTimers();
    try {
      const { network, scoreboard, display } = pair();
      const told: boolean[] = [];
      display.onTrust = (trusted) => told.push(trusted);

      await scoreboard.host(createMatch(config), 'A vs B');
      await display.join('phone-a');

      network.dropIf = (message) => message.kind === 'state';
      await scorePoint(scoreboard, 'side1', 1);
      jest.advanceTimersByTime(10_000);
      expect(told).toEqual([false]);

      // Nothing is retried and nobody is asked to do anything: the next beat
      // still disagrees, so the mirror asks again and this time gets an answer.
      network.dropIf = null;
      jest.advanceTimersByTime(4000);

      expect(told).toEqual([false, true]);
      expect(display.current!.points).toEqual([1, 0]);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('a camera lining up its recording', () => {
  test('learns how far its clock is from the scoreboard', async () => {
    const network = new LoopbackNetwork();
    const scoreboard = link(new LoopbackTransport(network, 'phone-a'), 'host');
    const camera = link(new LoopbackTransport(network, 'phone-b'), 'guest');

    await scoreboard.host(createMatch(config), 'A vs B');
    await camera.join('phone-a');

    // Loopback has no latency, so the two clocks agree to the millisecond. What
    // matters is that an offset was worked out at all.
    expect(Math.abs(camera.clockOffset)).toBeLessThan(50);
  });

  // The loopback is instant, which is exactly why it cannot catch the bug this
  // guards against: a reply carrying one timestamp reports the difference
  // between the clocks *plus* however long the message took, and calls the sum
  // the difference. Here the answer is built by hand with the travel written in.
  test('cancels the travel out instead of counting it as a difference', async () => {
    const network = new LoopbackNetwork();
    const hostTransport = new LoopbackTransport(network, 'phone-a');
    const scoreboard = link(hostTransport, 'host');
    const camera = link(new LoopbackTransport(network, 'phone-b'), 'guest');

    await scoreboard.host(createMatch(config), 'A vs B');
    await camera.join('phone-a');

    // A scoreboard whose clock reads a second ahead, answering a probe that took
    // 200 ms to reach it and 200 ms to come back.
    const askedAt = Date.now() - 400;
    const receivedAt = askedAt + 200 + 1000;
    await hostTransport.send({
      kind: 'clockReply',
      askedAt,
      receivedAt,
      sentAt: receivedAt,
    });

    // One second, not one and a fifth: the round trip cancels.
    expect(camera.clockOffset).toBeGreaterThan(950);
    expect(camera.clockOffset).toBeLessThan(1050);
  });
});
