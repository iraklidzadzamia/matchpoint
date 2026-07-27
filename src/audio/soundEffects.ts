import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

type Effect = 'point' | 'game' | 'set' | 'match' | 'undo';

const SOURCES: Record<Effect, number> = {
  point: require('../../assets/audio/ball-hit.wav'),
  game: require('../../assets/audio/applause-game.wav'),
  set: require('../../assets/audio/applause-set.wav'),
  match: require('../../assets/audio/celebration.wav'),
  undo: require('../../assets/audio/undo.wav'),
};

const VOLUMES: Record<Effect, number> = {
  point: 0.85,
  game: 0.7,
  set: 0.75,
  match: 0.8,
  undo: 0.5,
};

class SoundEffectsManager {
  private enabled: boolean = true;
  private players: Partial<Record<Effect, AudioPlayer>> = {};
  private audioModeReady = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private async ensureAudioMode() {
    if (this.audioModeReady) return;
    this.audioModeReady = true;
    try {
      // Matches are played with the ringer switch off as often as not, so the
      // score has to be audible in silent mode.
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch (err) {
      console.warn('Audio mode error:', err);
    }
  }

  private getPlayer(effect: Effect): AudioPlayer {
    let player = this.players[effect];
    if (!player) {
      player = createAudioPlayer(SOURCES[effect]);
      player.volume = VOLUMES[effect];
      this.players[effect] = player;
    }
    return player;
  }

  private async play(effect: Effect) {
    if (!this.enabled) return;
    await this.ensureAudioMode();

    try {
      const player = this.getPlayer(effect);
      // Rewind first: a second tap should retrigger the sound, not be ignored
      // because the player is still sitting at the end of the last one.
      if (player.currentTime > 0) {
        await player.seekTo(0);
      }
      player.play();
    } catch (err) {
      console.warn('SFX playback error:', err);
    }
  }

  async playPointPop() {
    await this.play('point');
  }

  async playApplauseGame() {
    await this.play('game');
  }

  async playApplauseSet() {
    await this.play('set');
  }

  async playCelebrationMatch() {
    await this.play('match');
  }

  async playUndo() {
    await this.play('undo');
  }
}

export const soundEffects = new SoundEffectsManager();
