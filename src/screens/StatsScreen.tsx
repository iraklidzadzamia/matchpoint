import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../engine/types';
import { loadHistory } from '../storage/matchStorage';
import { computeGroupStats, formatTotalTime } from '../engine/groupStats';
import { PlayerTable } from '../components/PlayerTable';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface StatsScreenProps {
  onBack: () => void;
}

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

            <PlayerTable players={stats.players} />

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
