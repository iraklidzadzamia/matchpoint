import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        <Text
          style={[styles.nameText, isLeftServing && styles.nameTextServing]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {leftName}
        </Text>
      </View>

      {/* In a points round there are no games or sets to show; the useful thing
          in the middle is what the round is being played to. */}
      {state.config.scoringMode === 'points' ? (
        <View style={styles.scoreMatrix}>
          <Text style={styles.targetText}>
            {t('ui.toPoints', { count: String(state.config.pointsToWin) })}
          </Text>
        </View>
      ) : (
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
      )}

      {/* Right Side Info */}
      <View style={[styles.sideGroup, styles.sideGroupRight]}>
        <Text
          style={[styles.nameText, styles.nameTextRight, !isLeftServing && styles.nameTextServing]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {rightName}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.glass.bg,
    borderColor: theme.colors.glass.border,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 8,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideGroupRight: {
    justifyContent: 'flex-end',
  },
  // Sized for the common case; adjustsFontSizeToFit shrinks long pair names
  // rather than truncating them.
  nameText: {
    flexShrink: 1,
    color: theme.colors.text.primary,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  nameTextRight: {
    textAlign: 'right',
  },
  nameTextServing: {
    color: theme.colors.accent.ball,
  },
  targetText: {
    color: theme.colors.text.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  scoreMatrix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: theme.spacing.md,
  },
  // Finished sets stay small; the set being played is the one you glance at.
  setColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.55,
  },
  currentSetColumn: {
    opacity: 1,
    gap: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent.primary,
  },
  setScoreText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  setScoreDash: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  currentSetScoreText: {
    color: theme.colors.accent.primary,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
});
