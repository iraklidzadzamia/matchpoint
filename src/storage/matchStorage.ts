import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchState, MatchConfig, AppSettings } from '../engine/types';

const MATCH_KEY = '@matchpoint_current_match';
const SETTINGS_KEY = '@matchpoint_settings';
const APP_SETTINGS_KEY = '@matchpoint_app_settings';
const UNDO_KEY = '@matchpoint_undo_stack';

export const defaultAppSettings: AppSettings = {
  voiceAnnounce: true,
  liveCrowd: true,
  maxBrightness: true,
};

export const defaultMatchConfig: MatchConfig = {
  sport: 'tennis',
  format: 'singles',
  totalSets: 3,
  tieBreakEnabled: true,
  matchTieBreakEnabled: false,
  tieBreakTo: 7,
  goldenPointEnabled: false,
  advantagesBeforeGolden: 1,
  swapSides: 'oddGames',
  side1: { player1: 'Side 1' },
  side2: { player1: 'Side 2' },
  servingFirst: 'side1',
  scoreKeeper: 'side1',
};

export async function saveCurrentMatch(state: MatchState | null): Promise<void> {
  try {
    if (!state) {
      await AsyncStorage.removeItem(MATCH_KEY);
    } else {
      await AsyncStorage.setItem(MATCH_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.warn('Save match error:', err);
  }
}

export async function loadCurrentMatch(): Promise<MatchState | null> {
  try {
    const raw = await AsyncStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MatchState;
  } catch (err) {
    console.warn('Load match error:', err);
    return null;
  }
}

export async function saveSettings(settings: Partial<MatchConfig>): Promise<void> {
  try {
    const existing = await loadSettings();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...existing, ...settings }));
  } catch (err) {
    console.warn('Save settings error:', err);
  }
}

export async function loadSettings(): Promise<Partial<MatchConfig>> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Load settings error:', err);
    return {};
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Save app settings error:', err);
  }
}

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return defaultAppSettings;
    return { ...defaultAppSettings, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Load app settings error:', err);
    return defaultAppSettings;
  }
}

export async function saveUndoStack(states: MatchState[]): Promise<void> {
  try {
    await AsyncStorage.setItem(UNDO_KEY, JSON.stringify(states));
  } catch (err) {
    console.warn('Save undo stack error:', err);
  }
}

export async function loadUndoStack(): Promise<MatchState[]> {
  try {
    const raw = await AsyncStorage.getItem(UNDO_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MatchState[];
  } catch (err) {
    console.warn('Load undo stack error:', err);
    return [];
  }
}
