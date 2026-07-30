import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchRecord } from '../engine/types';
import { theme } from '../styles/theme';
import { loadCurrentMatch, loadHistory } from '../storage/matchStorage';
import { MatchScoreLines } from '../components/MatchScoreLines';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { t } from '../i18n';

interface HomeScreenProps {
  /**
   * False while this screen is only being shown underneath another one, so it
   * can stay mounted for the back transition and still refresh when it is the
   * screen the user is actually on.
   */
  isActive: boolean;
  onStartSetup: () => void;
  onContinueMatch: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  isActive,
  onStartSetup,
  onContinueMatch,
  onOpenSettings,
  onOpenHistory,
  onOpenStats,
}) => {
  usePortraitOrientation();

  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  const [history, setHistory] = useState<MatchRecord[]>([]);

  useEffect(() => {
    if (!isActive) return;
    async function load() {
      const [match, records] = await Promise.all([loadCurrentMatch(), loadHistory()]);
      setHasSavedMatch(!!match && match.matchStatus === 'playing');
      setHistory(records);
    }
    load();
  }, [isActive]);

  const lastMatch = history[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.base} />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Ionicons name="tennisball" size={26} color={theme.colors.accent.ball} />
          <Text style={styles.logoText}>{t('ui.appTitle')}</Text>
        </View>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {lastMatch && (
          <TouchableOpacity style={styles.lastMatchCard} onPress={onOpenHistory} activeOpacity={0.8}>
            <View style={styles.lastMatchHeader}>
              <Text style={styles.eyebrow}>{t('ui.lastMatch')}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
            </View>
            <MatchScoreLines
              side1Name={lastMatch.side1Name}
              side2Name={lastMatch.side2Name}
              setScores={lastMatch.setScores}
              winner={lastMatch.winner}
            />
          </TouchableOpacity>
        )}

        {hasSavedMatch && (
          <TouchableOpacity style={styles.continueBtn} onPress={onContinueMatch} activeOpacity={0.85}>
            <Ionicons name="play-circle" size={24} color={theme.colors.accent.primary} />
            <Text style={styles.continueBtnText}>{t('ui.continueMatch')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.newMatchBtn} onPress={onStartSetup} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.bg.base} />
          <Text style={styles.newMatchBtnText}>{t('ui.newMatch')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerRow}>
        <TouchableOpacity style={styles.historyBar} onPress={onOpenHistory} activeOpacity={0.7}>
          <Ionicons name="time-outline" size={19} color={theme.colors.text.secondary} />
          <Text style={styles.historyBarText}>{t('ui.history')}</Text>
          {history.length > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{history.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Only worth opening once something has been played. */}
        {history.length > 0 && (
          <TouchableOpacity style={styles.statsBar} onPress={onOpenStats} activeOpacity={0.7}>
            <Ionicons name="stats-chart-outline" size={18} color={theme.colors.text.secondary} />
            <Text style={styles.historyBarText}>{t('ui.stats')}</Text>
          </TouchableOpacity>
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: theme.colors.text.primary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  settingsIconBtn: {
    padding: 8,
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  lastMatchCard: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  lastMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  eyebrow: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  newMatchBtn: {
    height: 60,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: theme.colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  newMatchBtnText: {
    color: theme.colors.bg.base,
    fontSize: 19,
    fontWeight: '800',
  },
  continueBtn: {
    height: 56,
    backgroundColor: theme.colors.bg.surface,
    borderColor: theme.colors.accent.primary,
    borderWidth: 1.5,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: theme.colors.accent.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  historyBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  historyBarText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.elevated,
    alignItems: 'center',
  },
  countText: {
    color: theme.colors.text.muted,
    fontSize: 12,
    fontWeight: '800',
  },
});
