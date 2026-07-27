import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { MatchState, PlayerSide } from '../engine/types';
import { getDisplayScore } from '../engine/scoring';
import { SetScoreBar } from '../components/SetScoreBar';
import { PlayerZone } from '../components/PlayerZone';
import { UndoButton } from '../components/UndoButton';
import { PlayersServingOverlay } from '../components/PlayersServingOverlay';
import { useLandscapeOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface ScoreScreenProps {
  matchState: MatchState;
  canUndo: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAddPoint: (side: PlayerSide) => void;
  onUndo: () => void;
  onSelectServer: (side: PlayerSide, playerIndex: 0 | 1) => void;
  onSwapSides: () => void;
  onOpenSettings: () => void;
  onExitMatch: () => void;
  onMatchFinished: () => void;
}

export const ScoreScreen: React.FC<ScoreScreenProps> = ({
  matchState,
  canUndo,
  soundEnabled,
  onToggleSound,
  onAddPoint,
  onUndo,
  onSelectServer,
  onSwapSides,
  onOpenSettings,
  onExitMatch,
  onMatchFinished,
}) => {
  useLandscapeOrientation();
  useKeepAwake();

  const [showPlayersOverlay, setShowPlayersOverlay] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Timer calculation
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (matchState && matchState.matchStatus === 'playing') {
        const diff = Math.floor((Date.now() - matchState.matchStartTime) / 1000);
        setElapsedSeconds(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [matchState]);

  useEffect(() => {
    if (matchState.matchStatus === 'finished') {
      onMatchFinished();
    }
  }, [matchState.matchStatus]);

  const handlePointTap = (side: PlayerSide) => {
    setTapCount((prev) => prev + 1);
    onAddPoint(side);
  };

  const handleExitPress = () => {
    Alert.alert(t('ui.exitMatchTitle'), t('ui.exitMatchMessage'), [
      { text: t('ui.cancel'), style: 'cancel' },
      { text: t('ui.exitMatch'), style: 'destructive', onPress: onExitMatch },
    ]);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(mins)}:${pad(s)}`;
  };

  const display = getDisplayScore(matchState);

  // Determine physical display side based on courtSide ('original' or 'swapped')
  const isSwapped = matchState.courtSide === 'swapped';
  const leftSide: PlayerSide = isSwapped ? 'side2' : 'side1';
  const rightSide: PlayerSide = isSwapped ? 'side1' : 'side2';

  const leftScore = isSwapped ? display.side2Score : display.side1Score;
  const rightScore = isSwapped ? display.side1Score : display.side2Score;

  // History log of points in current game (last 3 points)
  const recentHistory = matchState.gameHistory.slice(-3);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      {/* Top Header Bar */}
      <SetScoreBar
        state={matchState}
        onPressPlayers={() => setShowPlayersOverlay(true)}
      />

      {/* Main Touch Play Zones (80% Height) */}
      <View style={styles.zonesContainer}>
        <PlayerZone
          side={leftSide}
          score={leftScore}
          onTap={handlePointTap}
          showTapHint={tapCount < 3}
        />

        <View style={styles.zoneSeparator} />

        <PlayerZone
          side={rightSide}
          score={rightScore}
          onTap={handlePointTap}
          showTapHint={tapCount < 3}
        />
      </View>

      {/* Bottom Bar & Controls */}
      <View style={styles.bottomBar}>
        {/* Left Bottom Quick Actions */}
        <View style={styles.leftControls}>
          <TouchableOpacity style={styles.iconControlBtn} onPress={handleExitPress}>
            <Ionicons name="exit-outline" size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => setShowPlayersOverlay(true)}
          >
            <Ionicons name="people-outline" size={16} color={theme.colors.text.primary} />
            <Text style={styles.actionPillText}>{t('ui.playersAndServing')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPillBtn} onPress={onSwapSides}>
            <Ionicons name="swap-horizontal" size={16} color={theme.colors.text.primary} />
            <Text style={styles.actionPillText}>{t('ui.swapSides')}</Text>
          </TouchableOpacity>
        </View>

        {/* Center Game Point Log History */}
        <View style={styles.centerHistory}>
          {recentHistory.map((item, idx) => (
            <Text key={idx} style={styles.historyLogText}>
              {item}
            </Text>
          ))}
        </View>

        {/* Right Bottom Actions & Timer */}
        <View style={styles.rightControls}>
          <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>

          <UndoButton onPress={onUndo} disabled={!canUndo} />

          <TouchableOpacity style={styles.iconControlBtn} onPress={onToggleSound}>
            <Ionicons
              name={soundEnabled ? "volume-medium-outline" : "volume-mute-outline"}
              size={20}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconControlBtn} onPress={onOpenSettings}>
            <Ionicons name="settings-outline" size={20} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Mid-Game Players & Serving Modal */}
      <PlayersServingOverlay
        visible={showPlayersOverlay}
        state={matchState}
        onClose={() => setShowPlayersOverlay(false)}
        onSelectServer={onSelectServer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.base,
  },
  zonesContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  zoneSeparator: {
    width: 1,
    height: '70%',
    backgroundColor: theme.colors.glass.border,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    backgroundColor: theme.colors.glass.bg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glass.border,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.bg.surface,
    borderColor: theme.colors.glass.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  actionPillText: {
    color: theme.colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  centerHistory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLogText: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  iconControlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg.surface,
    borderColor: theme.colors.glass.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
