import { Audio } from 'expo-av';

class LiveCrowdManager {
  private enabled: boolean = true;
  private sound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.isPlaying) {
      this.stop();
    }
  }

  async start() {
    if (!this.enabled || this.isPlaying) return;

    try {
      // Create subtle low white-noise ambient simulation for stadium background
      // Using looping ambient WAV
      const sampleRate = 11025;
      const numSamples = sampleRate * 3; // 3 sec loop
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      const writeStr = (off: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      // Low-pass filtered noise for stadium murmur
      let lastVal = 0;
      for (let i = 0; i < numSamples; i++) {
        const white = (Math.random() * 2 - 1) * 0.08;
        lastVal = lastVal * 0.95 + white * 0.05; // Low-pass filter
        const sample = Math.max(-32768, Math.min(32767, Math.floor(lastVal * 32767)));
        view.setInt16(44 + i * 2, sample, true);
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

      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/wav;base64,${base64}` },
        { isLooping: true, volume: 0.15, shouldPlay: true }
      );

      this.sound = sound;
      this.isPlaying = true;
    } catch (err) {
      console.warn('Live crowd start error:', err);
    }
  }

  async stop() {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (err) {
        // ignore
      }
      this.sound = null;
    }
    this.isPlaying = false;
  }
}

export const liveCrowd = new LiveCrowdManager();
