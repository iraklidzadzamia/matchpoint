import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchState } from '../engine/types';
import { getSideNames } from '../engine/scoring';
import { theme } from '../styles/theme';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { t } from '../i18n';

interface MatchSummaryScreenProps {
  matchState: MatchState;
  onNewMatch: () => void;
  onGoHome: () => void;
}

export const MatchSummaryScreen: React.FC<MatchSummaryScreenProps> = ({
  matchState,
  onNewMatch,
  onGoHome,
}) => {
  usePortraitOrientation();

  const winnerSide = matchState.matchWinner || 'side1';
  const winnerName = getSideNames(matchState.config, winnerSide);

  const endTime = matchState.matchEndTime ?? Date.now();
  const durationSec = Math.floor((endTime - matchState.matchStartTime) / 1000);
  const mins = Math.floor(durationSec / 60);
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  const durationText = hours > 0 ? `${hours}h ${remMins}m` : `${mins}m`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Trophy / Winner Banner */}
        <View style={styles.trophyContainer}>
          <Ionicons name="trophy" size={80} color={theme.colors.status.gold} />
          <Text style={styles.winnerLabel}>{t('ui.winner')}</Text>
          <Text style={styles.winnerName}>{winnerName}</Text>
        </View>

        {/* Set Scores Table */}
        <View style={styles.scoreCard}>
          <Text style={styles.cardHeader}>Match Score</Text>
          {matchState.completedSets.map((setScore, idx) => (
            <View key={idx} style={styles.setRow}>
              <Text style={styles.setText}>Set {idx + 1}</Text>
              <Text style={styles.scoreText}>
                {setScore[0]} - {setScore[1]}
              </Text>
            </View>
          ))}
          <View style={styles.durationRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.text.secondary} />
            <Text style={styles.durationText}>Duration: {durationText}</Text>
          </View>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.newMatchBtn} onPress={onNewMatch}>
          <Text style={styles.newMatchBtnText}>{t('ui.newMatch')}</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.bg.base} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={onGoHome}>
          <Text style={styles.homeBtnText}>Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.base,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  trophyContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  winnerLabel: {
    color: theme.colors.status.gold,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: theme.spacing.sm,
  },
  winnerName: {
    color: theme.colors.text.primary,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    marginBottom: theme.spacing.xl,
  },
  cardHeader: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  setText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scoreText: {
    color: theme.colors.accent.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
  },
  durationText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
  newMatchBtn: {
    height: 56,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  newMatchBtnText: {
    color: theme.colors.bg.base,
    fontSize: 18,
    fontWeight: '800',
  },
  homeBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
