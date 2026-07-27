import * as Speech from 'expo-speech';

class ScoreAnnouncer {
  private enabled: boolean = true;
  private voice: string | undefined = undefined;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVoice(voiceId: string | undefined) {
    this.voice = voiceId;
  }

  async announce(text: string): Promise<void> {
    if (!this.enabled || !text) return;

    try {
      // Stop previous speech if speaking
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
      }

      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.92, // Classic tennis umpire cadence
        voice: this.voice,
      });
    } catch (err) {
      console.warn('Speech announcement error:', err);
    }
  }

  async testVoice(name: string): Promise<void> {
    try {
      await Speech.stop();
      Speech.speak(`Game, ${name}`, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.92,
      });
    } catch (err) {
      console.warn('Test voice error:', err);
    }
  }
}

export const scoreAnnouncer = new ScoreAnnouncer();
