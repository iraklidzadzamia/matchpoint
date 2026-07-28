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
import { loadHistory, clearHistory, deleteFromHistory } from '../storage/matchStorage';
import { MatchScoreLines } from '../components/MatchScoreLines';
import { MatchDetailScreen } from './MatchDetailScreen';
import { SwipeBackView } from '../components/SwipeBackView';
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

const MatchRow: React.FC<{
  record: MatchRecord;
  onOpen: (record: MatchRecord) => void;
  onDelete: (record: MatchRecord) => void;
}> = ({ record, onOpen, onDelete }) => (
  <TouchableOpacity style={styles.card} onPress={() => onOpen(record)} activeOpacity={0.75}>
    <View style={styles.cardHeader}>
      <Text style={styles.metaText}>
        {record.sport === 'tennis' ? t('ui.tennis') : t('ui.padel')} ·{' '}
        {record.format === 'singles' ? t('ui.singles') : t('ui.doubles')}
      </Text>
      <Text style={styles.metaText}>{formatDate(record.startedAt)}</Text>
    </View>

    <MatchScoreLines
      side1Name={record.side1Name}
      side2Name={record.side2Name}
      setScores={record.setScores}
      winner={record.winner}
    />

    <View style={styles.footerRow}>
      <View style={styles.durationGroup}>
        <Ionicons name="time-outline" size={13} color={theme.colors.text.muted} />
        <Text style={styles.durationText}>{formatDuration(record.durationSec)}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onDelete(record)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="trash-outline" size={16} color={theme.colors.text.muted} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  usePortraitOrientation();

  const [records, setRecords] = useState<MatchRecord[] | null>(null);
  // The detail view lives inside history rather than in the app's screen
  // switch, so backing out of it lands on the list instead of the home screen.
  const [openId, setOpenId] = useState<string | null>(null);

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

  const handleDeleteOne = (record: MatchRecord) => {
    Alert.alert(
      t('ui.deleteMatchTitle'),
      `${record.side1Name} — ${record.side2Name}`,
      [
        { text: t('ui.cancel'), style: 'cancel' },
        {
          text: t('ui.delete'),
          style: 'destructive',
          onPress: async () => {
            setOpenId((id) => (id === record.id ? null : id));
            setRecords(await deleteFromHistory(record.id));
          },
        },
      ]
    );
  };

  const isEmpty = records !== null && records.length === 0;
  const openRecord = records?.find((r) => r.id === openId) ?? null;

  if (openRecord) {
    return (
      <MatchDetailScreen
        record={openRecord}
        onBack={() => setOpenId(null)}
        onDelete={handleDeleteOne}
      />
    );
  }

  return (
    <SwipeBackView onBack={onBack}>
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
          renderItem={({ item }) => (
            <MatchRow record={item} onOpen={(r) => setOpenId(r.id)} onDelete={handleDeleteOne} />
          )}
          contentContainerStyle={styles.listContent}
        />
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glass.border,
  },
  durationGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
