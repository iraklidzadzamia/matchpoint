import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sport } from '../engine/types';
import { theme } from '../styles/theme';
import { loadCurrentMatch } from '../storage/matchStorage';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { t } from '../i18n';

interface HomeScreenProps {
  onStartSetup: (sport: Sport) => void;
  onContinueMatch: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartSetup,
  onContinueMatch,
  onOpenSettings,
}) => {
  usePortraitOrientation();

  const [hasSavedMatch, setHasSavedMatch] = useState(false);
  const [selectedSport, setSelectedSport] = useState<Sport>('tennis');

  useEffect(() => {
    async function checkSaved() {
      const match = await loadCurrentMatch();
      if (match && match.matchStatus === 'playing') {
        setHasSavedMatch(true);
      }
    }
    checkSaved();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg.base} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>🎾 MatchPoint</Text>
        </View>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>Select Sport</Text>

        {/* Sport Selection Cards */}
        <View style={styles.sportCardsRow}>
          <TouchableOpacity
            style={[
              styles.sportCard,
              selectedSport === 'tennis' && styles.selectedSportCard,
            ]}
            onPress={() => setSelectedSport('tennis')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="tennisball"
              size={48}
              color={selectedSport === 'tennis' ? theme.colors.accent.secondary : theme.colors.text.muted}
            />
            <Text style={styles.sportTitle}>{t('ui.tennis')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sportCard,
              selectedSport === 'padel' && styles.selectedSportCard,
            ]}
            onPress={() => setSelectedSport('padel')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="fitness-outline"
              size={48}
              color={selectedSport === 'padel' ? theme.colors.accent.primary : theme.colors.text.muted}
            />
            <Text style={styles.sportTitle}>{t('ui.padel')}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.newMatchBtn}
          onPress={() => onStartSetup(selectedSport)}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.bg.base} />
          <Text style={styles.newMatchBtnText}>{t('ui.newMatch')}</Text>
        </TouchableOpacity>

        {hasSavedMatch && (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={onContinueMatch}
            activeOpacity={0.8}
          >
            <Ionicons name="play-circle-outline" size={24} color={theme.colors.accent.primary} />
            <Text style={styles.continueBtnText}>{t('ui.continueMatch')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.activeTab}>
          <Ionicons name="add-circle" size={20} color={theme.colors.accent.primary} />
          <Text style={styles.activeTabText}>{t('ui.newMatch')}</Text>
        </View>

        <View style={styles.disabledTab}>
          <Ionicons name="time-outline" size={20} color={theme.colors.text.muted} />
          <Text style={styles.disabledTabText}>{t('ui.history')}</Text>
        </View>
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
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  sportCardsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  sportCard: {
    flex: 1,
    height: 160,
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 2,
    borderColor: theme.colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  selectedSportCard: {
    borderColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.accent.primaryGlow,
  },
  sportTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  newMatchBtn: {
    height: 56,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  newMatchBtnText: {
    color: theme.colors.bg.base,
    fontSize: 18,
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
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.full,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  activeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg.elevated,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    gap: 6,
  },
  activeTabText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  disabledTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    opacity: 0.5,
    gap: 6,
  },
  disabledTabText: {
    color: theme.colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
