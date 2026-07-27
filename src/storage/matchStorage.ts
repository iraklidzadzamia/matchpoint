import AsyncStorage from '@react-native-async-storage/async-storage';
import { MatchState, MatchConfig, AppSettings, MatchRecord } from '../engine/types';

const MATCH_KEY = '@matchpoint_current_match';
const SETTINGS_KEY = '@matchpoint_settings';
const APP_SETTINGS_KEY = '@matchpoint_app_settings';
const UNDO_KEY = '@matchpoint_undo_stack';
const HISTORY_KEY = '@matchpoint_history';

// Each record is well under a kilobyte, so even a few thousand matches stay
// small enough for AsyncStorage; the cap just keeps the list bounded.
const HISTORY_LIMIT = 500;

export const defaultAppSettings: AppSettings = {
  voiceAnnounce: true,
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
  // Players really do change ends on odd games, but the person holding the
  // phone does not — auto-flipping moves the tap zones mid-match.
  swapSides: 'off',
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

export async function loadHistory(): Promise<MatchRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MatchRecord[];
  } catch (err) {
    console.warn('Load history error:', err);
    return [];
  }
}

export async function appendToHistory(record: MatchRecord): Promise<void> {
  try {
    const existing = await loadHistory();
    // Newest first, so the list needs no sorting when rendered.
    const next = [record, ...existing].slice(0, HISTORY_LIMIT);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('Append history error:', err);
  }
}

export async function deleteFromHistory(id: string): Promise<MatchRecord[]> {
  try {
    const next = (await loadHistory()).filter((r) => r.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch (err) {
    console.warn('Delete history entry error:', err);
    return loadHistory();
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.warn('Clear history error:', err);
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
