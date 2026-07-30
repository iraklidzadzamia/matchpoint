import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord, PlayerSide } from '../engine/types';
import { computeMatchStats, pointDifferential, SetBreakdown } from '../engine/matchStats';
import { MatchScoreLines } from '../components/MatchScoreLines';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface MatchDetailScreenProps {
  record: MatchRecord;
  onBack: () => void;
  onDelete: (record: MatchRecord) => void;
}

const sideColor = (side: PlayerSide) =>
  side === 'side1' ? theme.colors.side1.base : theme.colors.side2.base;

function formatClock(sec: number): string {
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
}

function formatShort(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

/**
 * "68", or "—" when that side never served — a very short match can do that.
 * The per-cent sign lives in the card's hint: two of them plus a dash wraps the
 * value onto a second line and the card stops matching the ones beside it.
 */
function servePercent(won: number, played: number): string {
  if (played === 0) return '—';
  return String(Math.round((won / played) * 100));
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const Stat: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
  </View>
);

/**
 * The running point difference, drawn as columns either side of a centre line:
 * above it side 1 was ahead, below it side 2 was. Long columns of one colour
 * are the runs that decided the match.
 */
const Momentum: React.FC<{ diff: number[] }> = ({ diff }) => {
  // One column per point gets unreadable past a couple of hundred; sampling
  // keeps the shape and the view count sane.
  const COLUMNS = 60;
  const columns = useMemo(() => {
    if (diff.length <= COLUMNS) return diff;
    const step = diff.length / COLUMNS;
    return Array.from({ length: COLUMNS }, (_, i) => diff[Math.floor((i + 1) * step) - 1]);
  }, [diff]);

  const peak = Math.max(1, ...columns.map(Math.abs));
  // A one-point lead has to leave a mark, or a close match looks like an empty
  // chart; without a floor it rounds away to nothing next to a big peak.
  const MIN_HEIGHT = 6;

  return (
    <View style={styles.chart}>
      <View style={styles.chartLine} />
      <View style={styles.chartColumns}>
        {columns.map((value, i) => {
          const height =
            value === 0 ? 0 : Math.max(MIN_HEIGHT, (Math.abs(value) / peak) * 100);
          const leader: PlayerSide = value >= 0 ? 'side1' : 'side2';
          return (
            <View key={i} style={styles.chartColumn}>
              <View style={styles.chartHalf}>
                {value > 0 ? (
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${height}%`, backgroundColor: sideColor(leader) },
                    ]}
                  />
                ) : null}
              </View>
              <View style={[styles.chartHalf, styles.chartHalfLower]}>
                {value < 0 ? (
                  <View
                    style={[
                      styles.chartBar,
                      { height: `${height}%`, backgroundColor: sideColor(leader) },
                    ]}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const SetRow: React.FC<{
  index: number;
  set: SetBreakdown;
  record: MatchRecord;
}> = ({ index, set, record }) => {
  const winnerName = set.winner === 'side1' ? record.side1Name : record.side2Name;
  return (
    <View style={styles.setRow}>
      <View style={[styles.setBadge, { borderColor: sideColor(set.winner) }]}>
        <Text style={styles.setBadgeText}>{index + 1}</Text>
      </View>
      <View style={styles.setBody}>
        <View style={styles.setTopLine}>
          <Text style={styles.setScore}>
            {set.score[0]}–{set.score[1]}
          </Text>
          <Text style={[styles.setWinner, { color: sideColor(set.winner) }]} numberOfLines={1}>
            {winnerName}
          </Text>
        </View>
        <Text style={styles.setMeta}>
          {formatClock(set.durationSec)} · {set.points[0] + set.points[1]} {t('ui.points')} (
          {set.points[0]}–{set.points[1]})
        </Text>
      </View>
    </View>
  );
};

export const MatchDetailScreen: React.FC<MatchDetailScreenProps> = ({
  record,
  onBack,
  onDelete,
}) => {
  usePortraitOrientation();

  const stats = useMemo(() => computeMatchStats(record), [record]);
  const diff = useMemo(() => pointDifferential(record), [record]);
  const hasPointDetail = stats.totalPoints > 0;

  return (
    <SwipeBackView onBack={onBack}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('ui.matchDetail')}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => onDelete(record)}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroMeta}>
              {record.sport === 'tennis' ? t('ui.tennis') : t('ui.padel')} ·{' '}
              {record.format === 'singles' ? t('ui.singles') : t('ui.doubles')}
            </Text>
            <MatchScoreLines
              side1Name={record.side1Name}
              side2Name={record.side2Name}
              setScores={record.setScores}
              winner={record.winner}
              size="large"
            />
            <Text style={styles.heroDate}>{formatDateTime(record.startedAt)}</Text>
          </View>

          <View style={styles.statGrid}>
            <Stat label={t('ui.duration')} value={formatClock(record.durationSec)} />
            {hasPointDetail ? (
              <>
                <Stat label={t('ui.totalPoints')} value={String(stats.totalPoints)} />
                <Stat
                  label={t('ui.pointsWon')}
                  value={`${stats.pointsWon[0]}–${stats.pointsWon[1]}`}
                />
                <Stat
                  label={t('ui.avgPoint')}
                  value={`${stats.averagePointSec}s`}
                />
                {stats.longestGame ? (
                  <Stat
                    label={t('ui.longestGame')}
                    value={formatShort(stats.longestGame.durationSec)}
                    hint={`${stats.longestGame.points} ${t('ui.points')}`}
                  />
                ) : null}
                {/* Missing for matches logged before the server was recorded. */}
                {stats.serve ? (
                  <Stat
                    label={t('ui.onServe')}
                    value={`${servePercent(stats.serve.won[0], stats.serve.played[0])}–${servePercent(
                      stats.serve.won[1],
                      stats.serve.played[1]
                    )}`}
                    hint={t('ui.onServeHint')}
                  />
                ) : null}
              </>
            ) : null}
          </View>

          {hasPointDetail ? (
            <>
              <Text style={styles.sectionLabel}>{t('ui.momentum')}</Text>
              <View style={styles.card}>
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: sideColor('side1') }]} />
                    <Text style={styles.legendText} numberOfLines={1}>
                      {record.side1Name}
                    </Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: sideColor('side2') }]} />
                    <Text style={styles.legendText} numberOfLines={1}>
                      {record.side2Name}
                    </Text>
                  </View>
                </View>
                <Momentum diff={diff} />
              </View>

              <Text style={styles.sectionLabel}>{t('ui.setBreakdown')}</Text>
              <View style={styles.card}>
                {stats.sets.map((set, i) => (
                  <SetRow key={i} index={i} set={set} record={record} />
                ))}
              </View>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyNote}>{t('ui.noPointDetail')}</Text>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: theme.spacing.md,
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
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  hero: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  heroMeta: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroDate: {
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
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
  statHint: {
    color: theme.colors.text.muted,
    fontSize: 11,
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
  },
  legend: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  chart: {
    height: 120,
    justifyContent: 'center',
  },
  chartLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: theme.colors.glass.border,
  },
  chartColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  chartColumn: {
    flex: 1,
  },
  chartHalf: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chartHalfLower: {
    justifyContent: 'flex-start',
  },
  chartBar: {
    width: '100%',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  setBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadgeText: {
    color: theme.colors.text.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  setBody: {
    flex: 1,
    gap: 2,
  },
  setTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
  },
  setScore: {
    color: theme.colors.text.primary,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  setWinner: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  setMeta: {
    color: theme.colors.text.muted,
    fontSize: 12,
  },
  emptyNote: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
