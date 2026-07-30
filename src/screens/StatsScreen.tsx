import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../engine/types';
import { loadHistory } from '../storage/matchStorage';
import { computeCareerStats, formatTotalTime, HeadToHead } from '../engine/careerStats';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface StatsScreenProps {
  onBack: () => void;
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * One row of a head-to-head table. The bar is the share of those matches you
 * won, so a long green bar is somebody you beat — it is drawn from `won` and
 * `lost` rather than `played`, because a row can hold matches too old to judge.
 */
const Record: React.FC<{ row: HeadToHead }> = ({ row }) => {
  const judged = row.won + row.lost;
  const share = judged > 0 ? row.won / judged : 0;

  return (
    <View style={styles.recordRow}>
      <View style={styles.recordTop}>
        <Text style={styles.recordName} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.recordScore}>
          {judged > 0 ? `${row.won}–${row.lost}` : `${row.played}`}
        </Text>
      </View>
      {judged > 0 ? (
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
        </View>
      ) : null}
    </View>
  );
};

export const StatsScreen: React.FC<StatsScreenProps> = ({ onBack }) => {
  usePortraitOrientation();

  const [history, setHistory] = useState<MatchRecord[]>([]);
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const stats = useMemo(() => computeCareerStats(history), [history]);
  const unranked = stats.played - stats.ranked;

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

        {stats.played === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="stats-chart-outline" size={40} color={theme.colors.text.muted} />
            <Text style={styles.emptyText}>{t('ui.statsEmpty')}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.statGrid}>
              <Stat label={t('ui.statPlayed')} value={String(stats.played)} />
              <Stat label={t('ui.statWon')} value={String(stats.won)} />
              <Stat label={t('ui.statLost')} value={String(stats.lost)} />
              <Stat
                label={t('ui.statWinRate')}
                value={stats.winRate === null ? '—' : `${Math.round(stats.winRate * 100)}%`}
              />
              <Stat label={t('ui.statOnCourt')} value={formatTotalTime(stats.totalSec)} />
              <Stat label={t('ui.statStreak')} value={String(stats.currentStreak)} />
            </View>

            {unranked > 0 ? (
              <Text style={styles.caveat}>
                {unranked === 1
                  ? t('ui.statUnrankedOne')
                  : t('ui.statUnrankedMany', { count: String(unranked) })}
              </Text>
            ) : null}

            {stats.bySport.length > 1 ? (
              <>
                <Text style={styles.sectionLabel}>{t('ui.statBySport')}</Text>
                <View style={styles.card}>
                  {stats.bySport.map((split) => (
                    <Record
                      key={split.sport}
                      row={{
                        name: split.sport === 'tennis' ? t('ui.tennis') : t('ui.padel'),
                        played: split.played,
                        won: split.won,
                        lost: split.lost,
                      }}
                    />
                  ))}
                </View>
              </>
            ) : null}

            {stats.opponents.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>{t('ui.statOpponents')}</Text>
                <View style={styles.card}>
                  {stats.opponents.slice(0, 8).map((row) => (
                    <Record key={row.name} row={row} />
                  ))}
                </View>
              </>
            ) : null}

            {stats.partners.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>{t('ui.statPartners')}</Text>
                <View style={styles.card}>
                  {stats.partners.slice(0, 8).map((row) => (
                    <Record key={row.name} row={row} />
                  ))}
                </View>
              </>
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
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '28%',
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  statValue: {
    color: theme.colors.text.primary,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: theme.colors.text.secondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  caveat: {
    color: theme.colors.text.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  recordRow: {
    gap: 6,
  },
  recordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  recordName: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  recordScore: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.bg.elevated,
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.accent.primary,
  },
});
