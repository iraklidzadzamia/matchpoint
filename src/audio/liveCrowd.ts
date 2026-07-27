import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const CROWD = require('../../assets/audio/crowd.wav');

// Quiet enough to sit behind the announcements rather than compete with them.
const AMBIENCE_VOLUME = 0.18;

class LiveCrowdManager {
  private enabled: boolean = true;
  private player: AudioPlayer | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  start() {
    if (!this.enabled) return;

    try {
      if (!this.player) {
        this.player = createAudioPlayer(CROWD);
        // The file is crossfaded end to start, so looping is seamless.
        this.player.loop = true;
        this.player.volume = AMBIENCE_VOLUME;
      }
      if (!this.player.playing) {
        this.player.play();
      }
    } catch (err) {
      console.warn('Live crowd start error:', err);
    }
  }

  stop() {
    try {
      this.player?.pause();
    } catch (err) {
      // A player that was never loaded has nothing to stop.
    }
  }
}

export const liveCrowd = new LiveCrowdManager();
