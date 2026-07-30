import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PlayerStats } from '../engine/groupStats';
import { theme } from '../styles/theme';
import { t } from '../i18n';

/**
 * A row per player. Used both for the whole history and for a single evening —
 * the numbers are computed the same way either side, only the matches fed in
 * differ.
 */

/** A share as a whole number, or "—" when there is nothing to divide by. */
function percent(part: number, whole: number): string {
  if (whole === 0) return '—';
  return `${Math.round((part / whole) * 100)}`;
}

const Row: React.FC<{ player: PlayerStats }> = ({ player }) => (
  <View style={styles.row}>
    <Text style={styles.name} numberOfLines={1}>
      {player.name}
    </Text>
    <Text style={styles.cell}>{player.played}</Text>
    <Text style={[styles.cell, styles.cellWide]}>
      {player.won}–{player.lost}
    </Text>
    <Text style={styles.cell}>{percent(player.pointsWon, player.pointsPlayed)}</Text>
    <Text style={[styles.cell, styles.cellWide]}>
      {percent(player.servePointsWon, player.servePointsPlayed)}
    </Text>
  </View>
);

export const PlayerTable: React.FC<{ players: PlayerStats[] }> = ({ players }) => (
  <View style={styles.card}>
    <View style={[styles.row, styles.headRow]}>
      <Text style={[styles.name, styles.headText]}>{t('ui.colPlayer')}</Text>
      <Text style={[styles.cell, styles.headText]}>{t('ui.colMatches')}</Text>
      <Text style={[styles.cell, styles.cellWide, styles.headText]}>{t('ui.colWinLoss')}</Text>
      <Text style={[styles.cell, styles.headText]}>{t('ui.colPoints')}</Text>
      <Text style={[styles.cell, styles.cellWide, styles.headText]}>{t('ui.colServe')}</Text>
    </View>
    {players.map((player) => (
      <Row key={player.name} player={player} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  headRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
    paddingBottom: 8,
  },
  headText: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  name: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  cell: {
    width: 40,
    textAlign: 'right',
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  cellWide: {
    width: 52,
  },
});
