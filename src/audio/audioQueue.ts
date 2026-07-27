import { MatchState } from '../engine/types';
import { getScoreAnnouncement } from '../i18n';
import { scoreAnnouncer } from './scoreAnnouncer';
import { soundEffects } from './soundEffects';
import * as Haptics from 'expo-haptics';

class AudioQueueManager {
  async handlePointEvent(state: MatchState) {
    if (!state.lastEvent) return;

    const event = state.lastEvent;

    // 1. Haptic feedback immediately
    try {
      if (event.type === 'match') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (event.type === 'set' || event.type === 'game') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (err) {
      // Ignore haptics error if unsupported
    }

    // 2. Play Ball Pop SFX (50ms after tap)
    setTimeout(() => {
      soundEffects.playPointPop();
    }, 50);

    // 3. TTS Announcement after short pause (250ms)
    const textToAnnounce = getScoreAnnouncement(state);
    if (textToAnnounce) {
      setTimeout(() => {
        scoreAnnouncer.announce(textToAnnounce);
      }, 250);
    }
  }

  async handleUndo() {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {}

    soundEffects.playUndo();
  }
}

export const audioQueue = new AudioQueueManager();
