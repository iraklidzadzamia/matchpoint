import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Brightness from 'expo-brightness';
import { MatchConfig, PlayerSide, AppSettings } from './src/engine/types';
import {
  defaultMatchConfig,
  defaultAppSettings,
  saveSettings,
  loadSettings,
  saveAppSettings,
  loadAppSettings,
} from './src/storage/matchStorage';
import { useMatch } from './src/hooks/useMatch';
import { HomeScreen } from './src/screens/HomeScreen';
import { MatchSetupScreen } from './src/screens/MatchSetupScreen';
import { ScoreScreen } from './src/screens/ScoreScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { MatchSummaryScreen } from './src/screens/MatchSummaryScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { scoreAnnouncer } from './src/audio/scoreAnnouncer';
import { soundEffects } from './src/audio/soundEffects';
import { audioQueue } from './src/audio/audioQueue';

type Screen = 'home' | 'setup' | 'score' | 'summary' | 'history' | 'stats';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [activeConfig, setActiveConfig] = useState<MatchConfig>(defaultMatchConfig);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [muted, setMuted] = useState(false);

  const {
    matchState,
    canUndo,
    startNewMatch,
    addPoint,
    undo,
    selectServer,
    swapSides,
    updateMatchConfig,
    abandonMatch,
  } = useMatch();

  useEffect(() => {
    async function initSettings() {
      const [savedConfig, savedApp] = await Promise.all([loadSettings(), loadAppSettings()]);
      if (Object.keys(savedConfig).length > 0) {
        setActiveConfig((prev) => ({ ...prev, ...savedConfig }));
      }
      setAppSettings(savedApp);
    }
    initSettings();
    // Choose the voice and open the audio session up front, so the first
    // point of a match sounds the same as every one after it.
    scoreAnnouncer.pickBestVoice();
    soundEffects.prepare();
  }, []);

  // Mute is a master switch; the per-category settings apply underneath it.
  useEffect(() => {
    soundEffects.setEnabled(!muted);
    scoreAnnouncer.setEnabled(!muted && appSettings.voiceAnnounce);
  }, [muted, appSettings.voiceAnnounce]);

  // Nothing queued during a match should follow the user off the score screen.
  useEffect(() => {
    if (currentScreen !== 'score') audioQueue.stopAll();
  }, [currentScreen]);

  // restoreSystemBrightnessAsync is Android-only, so remember the user's own
  // level and put it back ourselves when leaving the score screen.
  const priorBrightnessRef = useRef<number | null>(null);

  useEffect(() => {
    async function applyBrightness() {
      if (currentScreen === 'score' && appSettings.maxBrightness) {
        if (priorBrightnessRef.current === null) {
          priorBrightnessRef.current = await Brightness.getBrightnessAsync();
        }
        await Brightness.setBrightnessAsync(1);
      } else if (priorBrightnessRef.current !== null) {
        const prior = priorBrightnessRef.current;
        priorBrightnessRef.current = null;
        await Brightness.setBrightnessAsync(prior);
      }
    }
    applyBrightness().catch(() => {});
  }, [currentScreen, appSettings.maxBrightness]);

  const handleStartSetup = () => {
    setCurrentScreen('setup');
  };

  const handleStartMatch = (config: MatchConfig) => {
    setActiveConfig(config);
    startNewMatch(config);
    setCurrentScreen('score');
  };

  const handleContinueMatch = () => {
    if (matchState) {
      setCurrentScreen('score');
    }
  };

  const handleUpdateConfig = (updated: Partial<MatchConfig>) => {
    setActiveConfig((prev) => ({ ...prev, ...updated }));
    saveSettings(updated);
    // Rule changes must also reach the match already in progress.
    if (matchState && matchState.matchStatus === 'playing') {
      updateMatchConfig(updated);
    }
  };

  const handleUpdateAppSettings = (updated: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const next = { ...prev, ...updated };
      saveAppSettings(next);
      return next;
    });
  };

  const handleExitMatch = async () => {
    await abandonMatch();
    setCurrentScreen('home');
  };

  const isOverlayScreen = currentScreen === 'setup' || currentScreen === 'history';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
      {/* Home stays mounted under setup and history, so swiping back reveals
          the real screen instead of an empty gap — and never remounts, so
          there is no flash when the swipe completes. */}
      {(currentScreen === 'home' || isOverlayScreen) && (
        <HomeScreen
          isActive={currentScreen === 'home'}
          onStartSetup={handleStartSetup}
          onContinueMatch={handleContinueMatch}
          onOpenSettings={() => setSettingsVisible(true)}
          onOpenHistory={() => setCurrentScreen('history')}
          onOpenStats={() => setCurrentScreen('stats')}
        />
      )}

      {currentScreen === 'history' && (
        <View style={StyleSheet.absoluteFill}>
          <HistoryScreen onBack={() => setCurrentScreen('home')} />
        </View>
      )}

      {currentScreen === 'stats' && (
        <View style={StyleSheet.absoluteFill}>
          <StatsScreen onBack={() => setCurrentScreen('home')} />
        </View>
      )}

      {currentScreen === 'setup' && (
        <View style={StyleSheet.absoluteFill}>
          <MatchSetupScreen
            baseConfig={activeConfig}
            onBack={() => setCurrentScreen('home')}
            onStartMatch={handleStartMatch}
            onOpenSettings={() => setSettingsVisible(true)}
          />
        </View>
      )}

      {currentScreen === 'score' && matchState && (
        <ScoreScreen
          matchState={matchState}
          canUndo={canUndo}
          soundEnabled={!muted}
          onToggleSound={() => setMuted((prev) => !prev)}
          onAddPoint={(side: PlayerSide) => addPoint(side)}
          onUndo={undo}
          onSelectServer={selectServer}
          onSwapSides={swapSides}
          onOpenSettings={() => setSettingsVisible(true)}
          onExitMatch={handleExitMatch}
          onMatchFinished={() => setCurrentScreen('summary')}
        />
      )}

      {currentScreen === 'summary' && matchState && (
        <MatchSummaryScreen
          matchState={matchState}
          onNewMatch={() => setCurrentScreen('setup')}
          onGoHome={() => setCurrentScreen('home')}
        />
      )}

      {/* Global Settings Modal */}
      <SettingsScreen
        visible={settingsVisible}
        config={matchState && matchState.matchStatus === 'playing' ? matchState.config : activeConfig}
        appSettings={appSettings}
        onClose={() => setSettingsVisible(false)}
        onUpdateConfig={handleUpdateConfig}
        onUpdateAppSettings={handleUpdateAppSettings}
      />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
});
