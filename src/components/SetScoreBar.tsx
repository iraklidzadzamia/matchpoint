import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchState } from '../engine/types';
import { getSideNames } from '../engine/scoring';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface SetScoreBarProps {
  state: MatchState;
  onPressPlayers?: () => void;
}

export const SetScoreBar: React.FC<SetScoreBarProps> = ({ state, onPressPlayers }) => {
  // Mirror the tap zones: when the court is swapped, side 2 is on the left.
  const isSwapped = state.courtSide === 'swapped';
  const leftSide = isSwapped ? 'side2' : 'side1';
  const rightSide = isSwapped ? 'side1' : 'side2';

  const leftName = getSideNames(state.config, leftSide);
  const rightName = getSideNames(state.config, rightSide);

  const isLeftServing = state.serving === leftSide;

  // Format completed set scores + current games score, ordered to match sides
  const orderScore = (score: [number, number]): [number, number] =>
    isSwapped ? [score[1], score[0]] : score;

  const allSetScores: [number, number][] = [...state.completedSets, [...state.games] as [number, number]]
    .map(orderScore);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPressPlayers}
      activeOpacity={0.8}
    >
      {/* Left Side Info */}
      <View style={styles.sideGroup}>
        {isLeftServing && (
          <View style={styles.serveBadge}>
            <Ionicons name="radio-outline" size={14} color={theme.colors.accent.primary} />
          </View>
        )}
        <View style={[styles.nameBadge, isLeftServing ? styles.nameBadgeServing : null]}>
          <Text style={styles.nameText} numberOfLines={1}>
            {leftName}
          </Text>
        </View>
        {state.config.scoreKeeper === leftSide && (
          <View style={styles.youBadge}>
            <Text style={styles.youText}>{t('ui.you')}</Text>
          </View>
        )}
      </View>

      {/* Set Score Matrix */}
      <View style={styles.scoreMatrix}>
        {allSetScores.map((setScore, idx) => {
          const isCurrentSet = idx === allSetScores.length - 1;
          return (
            <View key={idx} style={[styles.setColumn, isCurrentSet && styles.currentSetColumn]}>
              <Text style={[styles.setScoreText, isCurrentSet && styles.currentSetScoreText]}>
                {setScore[0]}
              </Text>
              <Text style={[styles.setScoreDash, isCurrentSet && styles.currentSetScoreText]}>
                –
              </Text>
              <Text style={[styles.setScoreText, isCurrentSet && styles.currentSetScoreText]}>
                {setScore[1]}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Right Side Info */}
      <View style={styles.sideGroup}>
        {state.config.scoreKeeper === rightSide && (
          <View style={styles.youBadge}>
            <Text style={styles.youText}>{t('ui.you')}</Text>
          </View>
        )}
        <View style={[styles.nameBadge, !isLeftServing ? styles.nameBadgeServing : null]}>
          <Text style={styles.nameText} numberOfLines={1}>
            {rightName}
          </Text>
        </View>
        {!isLeftServing && (
          <View style={styles.serveBadge}>
            <Ionicons name="radio-outline" size={14} color={theme.colors.accent.primary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.glass.bg,
    borderColor: theme.colors.glass.border,
    borderWidth: 1,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '35%',
  },
  serveBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameBadge: {
    backgroundColor: theme.colors.bg.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  nameBadgeServing: {
    borderColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.accent.primaryGlow,
  },
  nameText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  youBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.glass.bg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  youText: {
    color: theme.colors.text.secondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreMatrix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  setColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  currentSetColumn: {
    opacity: 1,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent.primary,
  },
  setScoreText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 12,
    textAlign: 'center',
  },
  setScoreDash: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
  currentSetScoreText: {
    color: theme.colors.accent.primary,
    fontSize: 16,
    fontWeight: '800',
  },
});
