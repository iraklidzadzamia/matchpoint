jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

jest.mock('../scoreAnnouncer', () => ({
  scoreAnnouncer: { announce: jest.fn(), stop: jest.fn() },
}));

jest.mock('../soundEffects', () => ({
  soundEffects: {
    playPointPop: jest.fn(),
    playApplauseGame: jest.fn(),
    playApplauseSet: jest.fn(),
    playCelebrationMatch: jest.fn(),
    playUndo: jest.fn(),
  },
}));

import { audioQueue } from '../audioQueue';
import { scoreAnnouncer } from '../scoreAnnouncer';
import { soundEffects } from '../soundEffects';
import { createMatch, addPoint } from '../../engine/scoring';
import { MatchConfig, MatchState } from '../../engine/types';

const announcer = scoreAnnouncer as jest.Mocked<typeof scoreAnnouncer>;
const sfx = soundEffects as jest.Mocked<typeof soundEffects>;

const config: MatchConfig = {
  sport: 'tennis',
  format: 'singles',
  totalSets: 1,
  tieBreakEnabled: true,
  matchTieBreakEnabled: false,
  tieBreakTo: 7,
  goldenPointEnabled: false,
  advantagesBeforeGolden: 1,
  swapSides: 'off',
  side1: { player1: 'Irakli' },
  side2: { player1: 'Rafael' },
  servingFirst: 'side1',
  scoreKeeper: 'side1',
};

/** A state whose last event is a plain point. */
function pointState(): MatchState {
  return addPoint(createMatch(config), 'side1');
}

/** A state whose last event is winning a game. */
function gameState(): MatchState {
  let match = createMatch(config);
  for (let i = 0; i < 4; i++) match = addPoint(match, 'side1');
  return match;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  audioQueue.stopAll();
  jest.useRealTimers();
});

describe('audioQueue scheduling', () => {
  test('the tick lands first and the score is left clear of it', async () => {
    await audioQueue.handlePointEvent(pointState());

    jest.advanceTimersByTime(10);
    expect(sfx.playPointPop).toHaveBeenCalledTimes(1);

    // The 170ms tick must have finished well before the score is spoken —
    // overlapping the two is what was cutting announcements short.
    jest.advanceTimersByTime(400);
    expect(announcer.announce).not.toHaveBeenCalled();

    jest.advanceTimersByTime(400);
    expect(announcer.announce).toHaveBeenCalledTimes(1);
  });

  test('winning a game brings applause after the announcement', async () => {
    await audioQueue.handlePointEvent(gameState());

    jest.advanceTimersByTime(1000);
    expect(sfx.playApplauseGame).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(sfx.playApplauseGame).toHaveBeenCalledTimes(1);
  });

  // Each of these used to leave its timers running, so sounds from a moment
  // that had already passed would land on top of the current one.
  test('a new point cancels what the previous one had queued', async () => {
    await audioQueue.handlePointEvent(gameState());
    jest.advanceTimersByTime(200);

    await audioQueue.handlePointEvent(pointState());
    jest.advanceTimersByTime(3000);

    // The superseded game applause never arrives
    expect(sfx.playApplauseGame).not.toHaveBeenCalled();
    expect(announcer.announce).toHaveBeenCalledTimes(1);
  });

  test('undo cancels the announcement of the point it took back', async () => {
    await audioQueue.handlePointEvent(pointState());
    jest.advanceTimersByTime(100);

    await audioQueue.handleUndo();
    jest.advanceTimersByTime(3000);

    expect(announcer.announce).not.toHaveBeenCalled();
    expect(announcer.stop).toHaveBeenCalled();
    expect(sfx.playUndo).toHaveBeenCalledTimes(1);
  });

  test('leaving the match silences everything still pending', async () => {
    await audioQueue.handlePointEvent(gameState());
    jest.advanceTimersByTime(100);

    audioQueue.stopAll();
    jest.advanceTimersByTime(3000);

    expect(announcer.announce).not.toHaveBeenCalled();
    expect(sfx.playApplauseGame).not.toHaveBeenCalled();
    expect(announcer.stop).toHaveBeenCalled();
  });

  test('rapid points leave exactly one announcement standing', async () => {
    for (let i = 0; i < 5; i++) {
      await audioQueue.handlePointEvent(pointState());
      jest.advanceTimersByTime(80);
    }
    jest.advanceTimersByTime(3000);

    expect(announcer.announce).toHaveBeenCalledTimes(1);
  });
});
