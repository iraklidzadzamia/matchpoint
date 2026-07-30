import { useEffect, useRef } from 'react';
import * as Brightness from 'expo-brightness';

/**
 * Holds the screen at full brightness while `enabled`, and puts the user's own
 * level back afterwards.
 *
 * The restoring is the whole reason this is a hook rather than two calls at the
 * call site: `restoreSystemBrightnessAsync` is Android-only, so on iOS the prior
 * level has to be remembered here and written back by hand — including when the
 * screen unmounts, which a component doing it inline tends to forget.
 *
 * Every caller keeps its own remembered level, and only a caller that actually
 * turned brightness up holds one, so two screens using this can never hand each
 * other the wrong level back.
 */
export function useMaxBrightness(enabled: boolean): void {
  const priorRef = useRef<number | null>(null);

  useEffect(() => {
    async function apply() {
      if (enabled) {
        if (priorRef.current === null) {
          priorRef.current = await Brightness.getBrightnessAsync();
        }
        await Brightness.setBrightnessAsync(1);
      } else if (priorRef.current !== null) {
        const prior = priorRef.current;
        priorRef.current = null;
        await Brightness.setBrightnessAsync(prior);
      }
    }
    apply().catch(() => {});
  }, [enabled]);

  // Leaving the screen entirely has to restore too, and the effect above only
  // runs again while the component is alive.
  useEffect(() => {
    return () => {
      const prior = priorRef.current;
      priorRef.current = null;
      if (prior !== null) {
        Brightness.setBrightnessAsync(prior).catch(() => {});
      }
    };
  }, []);
}
