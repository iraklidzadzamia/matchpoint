import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../engine/types';
import { loadHistory, clearHistory } from '../storage/matchStorage';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface HistoryScreenProps {
  onBack: () => void;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(sec: number): string {
  const mins = Math.floor(sec / 60);
  const hours = Math.floor(mins / 60);
  return hours > 0 ? `${hours}h ${mins % 60}m` : `${mins}m`;
}

const MatchRow: React.FC<{ record: MatchRecord }> = ({ record }) => {
  const side1Won = record.winner === 'side1';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.metaText}>
          {record.sport === 'tennis' ? t('ui.tennis') : t('ui.padel')} ·{' '}
          {record.format === 'singles' ? t('ui.singles') : t('ui.doubles')}
        </Text>
        <Text style={styles.metaText}>{formatDate(record.startedAt)}</Text>
      </View>

      <View style={styles.playerRow}>
        <Text
          style={[styles.playerName, side1Won && styles.playerNameWon]}
          numberOfLines={1}
        >
          {record.side1Name}
        </Text>
        <View style={styles.scoreGroup}>
          {record.setScores.map((set, idx) => (
            <Text key={idx} style={[styles.setScore, side1Won && styles.setScoreWon]}>
              {set[0]}
            </Text>
          ))}
          {side1Won && (
            <Ionicons name="trophy" size={15} color={theme.colors.status.gold} />
          )}
        </View>
      </View>

      <View style={styles.playerRow}>
        <Text
          style={[styles.playerName, !side1Won && styles.playerNameWon]}
          numberOfLines={1}
        >
          {record.side2Name}
        </Text>
        <View style={styles.scoreGroup}>
          {record.setScores.map((set, idx) => (
            <Text key={idx} style={[styles.setScore, !side1Won && styles.setScoreWon]}>
              {set[1]}
            </Text>
          ))}
          {!side1Won && (
            <Ionicons name="trophy" size={15} color={theme.colors.status.gold} />
          )}
        </View>
      </View>

      <View style={styles.durationRow}>
        <Ionicons name="time-outline" size={13} color={theme.colors.text.muted} />
        <Text style={styles.durationText}>{formatDuration(record.durationSec)}</Text>
      </View>
    </View>
  );
};

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  usePortraitOrientation();

  const [records, setRecords] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    loadHistory().then(setRecords);
  }, []);

  const handleClear = () => {
    Alert.alert(t('ui.clearHistoryTitle'), t('ui.clearHistoryMessage'), [
      { text: t('ui.cancel'), style: 'cancel' },
      {
        text: t('ui.clearHistory'),
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setRecords([]);
        },
      },
    ]);
  };

  const isEmpty = records !== null && records.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.history')}</Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleClear}
          disabled={!records || records.length === 0}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={records && records.length > 0 ? theme.colors.text.secondary : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View style={styles.emptyState}>
          <Ionicons name="tennisball-outline" size={56} color={theme.colors.text.muted} />
          <Text style={styles.emptyTitle}>{t('ui.historyEmptyTitle')}</Text>
          <Text style={styles.emptyText}>{t('ui.historyEmptyMessage')}</Text>
        </View>
      ) : (
        <FlatList
          data={records ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MatchRow record={item} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
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
  listContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  metaText: {
    color: theme.colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    paddingVertical: 3,
  },
  playerName: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  playerNameWon: {
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  scoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setScore: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  setScoreWon: {
    color: theme.colors.text.primary,
    fontWeight: '800',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glass.border,
  },
  durationText: {
    color: theme.colors.text.muted,
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
