import { Audio } from 'expo-av';

// Generate synthetic WAV audio data URIs for instant playback without external network downloads!
function createBeepWav(freq: number, durationMs: number, type: 'sine' | 'square' | 'noise' = 'sine'): string {
  const sampleRate = 22050;
  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 for Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Generate PCM samples with volume decay
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const decay = Math.max(0, 1 - i / numSamples);
    let sample = 0;

    if (type === 'sine') {
      sample = Math.sin(2 * Math.PI * freq * t) * decay;
    } else if (type === 'noise') {
      sample = (Math.random() * 2 - 1) * decay;
    } else if (type === 'square') {
      sample = (Math.sin(2 * Math.PI * freq * t) >= 0 ? 0.7 : -0.7) * decay;
    }

    const int16 = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767 * 0.7)));
    view.setInt16(44 + i * 2, int16, true);
  }

  const bytes = new Uint8Array(buffer);
  let base64 = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    base64 += chars[b1 >> 2];
    base64 += chars[((b1 & 3) << 4) | (b2 >> 4)];
    base64 += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=';
    base64 += i + 2 < bytes.length ? chars[b3 & 63] : '=';
  }
  return `data:audio/wav;base64,${base64}`;
}

const POINT_POP_WAV = createBeepWav(600, 120, 'sine');     // Crisp tennis ball pop
const DEUCE_CHORD_WAV = createBeepWav(330, 400, 'square');  // Dramatic chord
const APPLAUSE_GAME_WAV = createBeepWav(440, 600, 'noise'); // Game applause
const APPLAUSE_SET_WAV = createBeepWav(520, 1200, 'noise'); // Set applause
const CELEBRATION_WAV = createBeepWav(660, 2000, 'noise');  // Match ovation
const UNDO_SWOOSH_WAV = createBeepWav(250, 100, 'sine');    // Soft undo tick

class SoundEffectsManager {
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private async playDataUri(uri: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 0.8 }
      );
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (err) {
      console.warn('SFX playback error:', err);
    }
  }

  async playPointPop() {
    await this.playDataUri(POINT_POP_WAV);
  }

  async playDeuceChord() {
    await this.playDataUri(DEUCE_CHORD_WAV);
  }

  async playApplauseGame() {
    await this.playDataUri(APPLAUSE_GAME_WAV);
  }

  async playApplauseSet() {
    await this.playDataUri(APPLAUSE_SET_WAV);
  }

  async playCelebrationMatch() {
    await this.playDataUri(CELEBRATION_WAV);
  }

  async playUndo() {
    await this.playDataUri(UNDO_SWOOSH_WAV);
  }
}

export const soundEffects = new SoundEffectsManager();
