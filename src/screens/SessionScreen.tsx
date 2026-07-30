import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Session, sessionDayLabel } from '../engine/sessions';
import { computeGroupStats, formatTotalTime } from '../engine/groupStats';
import { PlayerTable } from '../components/PlayerTable';
import { MatchScoreLines } from '../components/MatchScoreLines';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface SessionScreenProps {
  session: Session;
  onBack: () => void;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * One outing on its own. The same counting as the all-time table, fed only this
 * evening's matches — which is what somebody wants at the end of a night out:
 * who actually played, and how it went for them today rather than ever.
 */
export const SessionScreen: React.FC<SessionScreenProps> = ({ session, onBack }) => {
  usePortraitOrientation();

  const stats = useMemo(() => computeGroupStats(session.matches), [session]);
  const day = sessionDayLabel(session.startedAt, {
    today: t('ui.today'),
    yesterday: t('ui.yesterday'),
  });

  return (
    <SwipeBackView onBack={onBack}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{day}</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.summary}>
            {formatTime(session.startedAt)}–{formatTime(session.endedAt)} ·{' '}
            {session.played === 1
              ? t('ui.sessionOneMatch')
              : t('ui.sessionMatches', { count: String(session.played) })}{' '}
            · {formatTotalTime(stats.totalSec)}
          </Text>

          <PlayerTable players={stats.players} />
          <Text style={styles.legend}>{t('ui.statsLegend')}</Text>

          <Text style={styles.sectionLabel}>{t('ui.sessionMatchList')}</Text>
          <View style={styles.card}>
            {/* Oldest first here: reading down the list is reading the evening
                forwards, unlike the history list where recent comes first. */}
            {[...session.matches].reverse().map((record, index) => (
              <View
                key={record.id}
                style={[styles.matchRow, index > 0 && styles.matchRowDivided]}
              >
                <Text style={styles.matchTime}>{formatTime(record.startedAt)}</Text>
                <View style={styles.matchScore}>
                  <MatchScoreLines
                    side1Name={record.side1Name}
                    side2Name={record.side2Name}
                    setScores={record.setScores}
                    winner={record.winner}
                  />
                </View>
              </View>
            ))}
          </View>
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
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  summary: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: theme.spacing.md,
    fontVariant: ['tabular-nums'],
  },
  legend: {
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
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    paddingHorizontal: theme.spacing.md,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  matchRowDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.glass.border,
  },
  matchTime: {
    color: theme.colors.text.muted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    width: 44,
  },
  matchScore: {
    flex: 1,
  },
});
