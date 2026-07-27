import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useLandscapeOrientation() {
  useEffect(() => {
    async function lockLandscape() {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch (err) {
        console.warn('Orientation lock error:', err);
      }
    }

    lockLandscape();

    return () => {
      // Unlock back to portrait on unmount
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      ).catch(() => {});
    };
  }, []);
}

export function usePortraitOrientation() {
  useEffect(() => {
    async function lockPortrait() {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (err) {
        console.warn('Orientation lock error:', err);
      }
    }

    lockPortrait();
  }, []);
}
