import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';

interface MatchScoreLinesProps {
  side1Name: string;
  side2Name: string;
  setScores: [number, number][];
  winner: PlayerSide;
  /** Larger type for the match summary; the compact size suits history cards. */
  size?: 'compact' | 'large';
}

/**
 * The scoreboard layout used on TV: one row per side, one column per set, so
 * you read a set score down the column instead of guessing whose 6 it is.
 */
export const MatchScoreLines: React.FC<MatchScoreLinesProps> = ({
  side1Name,
  side2Name,
  setScores,
  winner,
  size = 'compact',
}) => {
  const large = size === 'large';

  const renderRow = (side: PlayerSide) => {
    const won = winner === side;
    const name = side === 'side1' ? side1Name : side2Name;
    const idx = side === 'side1' ? 0 : 1;

    return (
      <View style={styles.row}>
        <Text
          style={[
            styles.name,
            large && styles.nameLarge,
            won && styles.nameWon,
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <View style={styles.scores}>
          {setScores.map((set, i) => (
            <Text
              key={i}
              style={[
                styles.score,
                large && styles.scoreLarge,
                won && styles.scoreWon,
              ]}
            >
              {set[idx]}
            </Text>
          ))}
          <View style={styles.trophySlot}>
            {won && (
              <Ionicons
                name="trophy"
                size={large ? 18 : 15}
                color={theme.colors.status.gold}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View>
      {renderRow('side1')}
      {renderRow('side2')}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  name: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  nameLarge: {
    fontSize: 19,
  },
  nameWon: {
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  scores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  score: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scoreLarge: {
    fontSize: 22,
    minWidth: 18,
  },
  scoreWon: {
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  // Reserved so both rows align whether or not the trophy is there.
  trophySlot: {
    width: 20,
    alignItems: 'center',
  },
});
