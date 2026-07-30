import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../engine/types';
import { loadHistory } from '../storage/matchStorage';
import { computeGroupStats, formatTotalTime, PlayerStats } from '../engine/groupStats';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface StatsScreenProps {
  onBack: () => void;
}

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

export const StatsScreen: React.FC<StatsScreenProps> = ({ onBack }) => {
  usePortraitOrientation();

  const [history, setHistory] = useState<MatchRecord[]>([]);
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const stats = useMemo(() => computeGroupStats(history), [history]);

  return (
    <SwipeBackView onBack={onBack}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('ui.stats')}</Text>
          <View style={styles.headerBtn} />
        </View>

        {stats.players.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={40} color={theme.colors.text.muted} />
            <Text style={styles.emptyText}>{t('ui.statsEmpty')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.summary}>
              {stats.matchesCounted === 1
                ? t('ui.statsSummaryOne', { time: formatTotalTime(stats.totalSec) })
                : t('ui.statsSummary', {
                    count: String(stats.matchesCounted),
                    time: formatTotalTime(stats.totalSec),
                  })}
            </Text>

            <View style={styles.card}>
              <View style={[styles.row, styles.headRow]}>
                <Text style={[styles.name, styles.headText]}>{t('ui.colPlayer')}</Text>
                <Text style={[styles.cell, styles.headText]}>{t('ui.colMatches')}</Text>
                <Text style={[styles.cell, styles.cellWide, styles.headText]}>
                  {t('ui.colWinLoss')}
                </Text>
                <Text style={[styles.cell, styles.headText]}>{t('ui.colPoints')}</Text>
                <Text style={[styles.cell, styles.cellWide, styles.headText]}>
                  {t('ui.colServe')}
                </Text>
              </View>
              {stats.players.map((player) => (
                <Row key={player.name} player={player} />
              ))}
            </View>

            <Text style={styles.legend}>{t('ui.statsLegend')}</Text>

            {/* Named rather than hidden: these matches happened, they just cannot
                say who played them. */}
            {stats.matchesSkipped > 0 ? (
              <Text style={styles.caveat}>
                {stats.matchesSkipped === 1
                  ? t('ui.statsSkippedOne')
                  : t('ui.statsSkippedMany', { count: String(stats.matchesSkipped) })}
              </Text>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </SwipeBackView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  headerBtn: {
    padding: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.text.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  summary: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
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
  legend: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: theme.spacing.sm,
  },
  caveat: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: theme.spacing.sm,
  },
});
