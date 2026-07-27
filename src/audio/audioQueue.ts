import { MatchEvent, MatchState } from '../engine/types';
import { getScoreAnnouncement } from '../i18n';
import { scoreAnnouncer } from './scoreAnnouncer';
import { soundEffects } from './soundEffects';
import * as Haptics from 'expo-haptics';

// The tick is immediate feedback and runs 160ms. The score is left a clear
// half-second behind it: the two go through different iOS subsystems
// (AVAudioPlayer and AVSpeechSynthesizer) sharing one session, and starting
// speech close to a sound effect was getting it cut short.
const TICK_DELAY = 0;
const TICK_LENGTH = 170;
const SPEECH_DELAY = TICK_LENGTH + 530;
const APPLAUSE_DELAY = { game: 1900, set: 2200, match: 2400 };

/**
 * Owns everything the app plays, and — importantly — everything it has queued
 * but not played yet. A point, an undo or leaving the match all cancel what is
 * still pending, so sounds from a stale moment can never land on top of the
 * current one.
 */
class AudioQueueManager {
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private after(ms: number, fn: () => void) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  private clearPending() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }

  private haptic(type: MatchEvent['type']) {
    try {
      if (type === 'match') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (type === 'set' || type === 'game') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      // Ignore haptics error if unsupported
    }
  }

  async handlePointEvent(state: MatchState) {
    if (!state.lastEvent) return;
    const event = state.lastEvent;

    // This point replaces whatever the last one still had queued.
    this.clearPending();

    this.haptic(event.type);
    this.after(TICK_DELAY, () => soundEffects.playPointPop());

    const textToAnnounce = getScoreAnnouncement(state);
    if (textToAnnounce) {
      this.after(SPEECH_DELAY, () => scoreAnnouncer.announce(textToAnnounce));
    }

    if (event.type === 'game') {
      this.after(APPLAUSE_DELAY.game, () => soundEffects.playApplauseGame());
    } else if (event.type === 'set') {
      this.after(APPLAUSE_DELAY.set, () => soundEffects.playApplauseSet());
    } else if (event.type === 'match') {
      this.after(APPLAUSE_DELAY.match, () => soundEffects.playCelebrationMatch());
    }
  }

  async handleUndo() {
    // Undo takes the point back, so anything it queued should go with it —
    // otherwise the score just undone is still announced a moment later.
    this.clearPending();
    scoreAnnouncer.stop();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {}

    soundEffects.playUndo();
  }

  /** Leaving the match: nothing queued should follow the user out. */
  stopAll() {
    this.clearPending();
    scoreAnnouncer.stop();
  }
}

export const audioQueue = new AudioQueueManager();
