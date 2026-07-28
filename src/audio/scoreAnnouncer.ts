import * as Speech from 'expo-speech';

// iOS does not tear an utterance down the instant stop() resolves. Speaking
// straight afterwards gets swallowed by the stop still landing, which cuts the
// announcement short — often after the first word. Rather than guess how long
// that takes, wait until the synthesiser actually reports itself idle.
const IDLE_POLL_MS = 25;
const IDLE_POLL_LIMIT = 24; // ~600ms, then give up and speak anyway

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Umpires at the majors are British, so a British voice is what a tennis
// score is expected to sound like. Enhanced voices are far less robotic than
// the compact ones the system picks by default.
const QUALITY_RANK: Record<string, number> = { Enhanced: 2, Default: 0 };
const PREFERRED_LANGUAGES = ['en-GB', 'en-AU', 'en-US'];

const VOICE_SETTINGS = (voice: string | undefined): Speech.SpeechOptions => ({
  language: 'en-GB',
  pitch: 0.98,
  rate: 0.88, // Classic tennis umpire cadence: unhurried and even
  voice,
});

function scoreVoice(voice: Speech.Voice): number {
  const langIndex = PREFERRED_LANGUAGES.indexOf(voice.language);
  if (langIndex === -1) return -1;
  // Language first, then quality: a compact British voice still beats an
  // enhanced American one for this.
  return (PREFERRED_LANGUAGES.length - langIndex) * 10 + (QUALITY_RANK[voice.quality] ?? 0);
}

class ScoreAnnouncer {
  private enabled: boolean = true;
  private voice: string | undefined = undefined;
  private voicePicked = false;
  // Bumped on every request so a superseded announcement can bail out.
  private sequence = 0;

  /**
   * Picks the best installed English voice once. Which voices exist varies by
   * device and by what the user has downloaded, so this asks rather than
   * hard-coding an identifier that may not be there.
   */
  async pickBestVoice(): Promise<void> {
    if (this.voicePicked) return;
    this.voicePicked = true;
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const best = voices
        .map((v) => ({ v, score: scoreVoice(v) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)[0];
      if (best) this.voice = best.v.identifier;
    } catch (err) {
      // Falling back to the system default is fine; it just sounds plainer.
      console.warn('Voice selection error:', err);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  /** Abandon whatever is being said, and any announcement still waiting. */
  stop() {
    this.sequence += 1;
    Speech.stop().catch(() => {});
  }

  /** Resolves once the synthesiser is genuinely finished with the last line. */
  private async waitUntilIdle(): Promise<void> {
    for (let i = 0; i < IDLE_POLL_LIMIT; i++) {
      if (!(await Speech.isSpeakingAsync())) return;
      await delay(IDLE_POLL_MS);
    }
  }

  async announce(text: string): Promise<void> {
    if (!this.enabled || !text) return;

    const mine = ++this.sequence;

    try {
      if (await Speech.isSpeakingAsync()) {
        await Speech.stop();
        await this.waitUntilIdle();
      }
      // A newer score arrived, or the voice was muted, while we waited.
      if (mine !== this.sequence || !this.enabled) return;

      Speech.speak(text, VOICE_SETTINGS(this.voice));
    } catch (err) {
      console.warn('Speech announcement error:', err);
    }
  }

  async testVoice(name: string): Promise<void> {
    try {
      this.sequence += 1;
      await Speech.stop();
      await this.waitUntilIdle();
      Speech.speak(`Game, ${name}`, VOICE_SETTINGS(this.voice));
    } catch (err) {
      console.warn('Test voice error:', err);
    }
  }
}

export const scoreAnnouncer = new ScoreAnnouncer();
