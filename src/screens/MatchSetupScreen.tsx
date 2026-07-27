import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sport, MatchConfig, PlayerSide, MatchFormat } from '../engine/types';
import { NameInput } from '../components/NameInput';
import { SideSelector } from '../components/SideSelector';
import { theme } from '../styles/theme';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { t } from '../i18n';

interface MatchSetupScreenProps {
  sport: Sport;
  baseConfig: MatchConfig;
  onBack: () => void;
  onStartMatch: (config: MatchConfig) => void;
  onOpenSettings: () => void;
}

export const MatchSetupScreen: React.FC<MatchSetupScreenProps> = ({
  sport,
  baseConfig,
  onBack,
  onStartMatch,
  onOpenSettings,
}) => {
  usePortraitOrientation();

  const [isSingles, setIsSingles] = useState<boolean>(baseConfig.format === 'singles');
  const [customNames, setCustomNames] = useState<boolean>(true);

  const [side1P1, setSide1P1] = useState('Irakli');
  const [side1P2, setSide1P2] = useState('Serena');
  const [side2P1, setSide2P1] = useState('Rafael');
  const [side2P2, setSide2P2] = useState('Venus');

  const [scoreKeeper, setScoreKeeper] = useState<PlayerSide>('side1');
  const [servingFirst, setServingFirst] = useState<PlayerSide>('side1');

  const handleSwapSidesInput = () => {
    setSide1P1(side2P1);
    setSide1P2(side2P2);
    setSide2P1(side1P1);
    setSide2P2(side1P2);
  };

  const resolvedNames = customNames
    ? { s1p1: side1P1.trim(), s1p2: side1P2.trim(), s2p1: side2P1.trim(), s2p2: side2P2.trim() }
    : { s1p1: '', s1p2: '', s2p1: '', s2p2: '' };

  const handleStart = () => {
    const format: MatchFormat = isSingles ? 'singles' : 'doubles';

    const config: MatchConfig = {
      ...baseConfig,
      sport,
      format,
      goldenPointEnabled: sport === 'padel' ? true : baseConfig.goldenPointEnabled,
      side1: {
        player1: resolvedNames.s1p1 || 'Side 1',
        player2: isSingles ? undefined : resolvedNames.s1p2 || 'Player 2',
      },
      side2: {
        player1: resolvedNames.s2p1 || 'Side 2',
        player2: isSingles ? undefined : resolvedNames.s2p2 || 'Player 2',
      },
      servingFirst,
      scoreKeeper,
    };

    onStartMatch(config);
  };

  const getSideLabel = (side: PlayerSide) => {
    if (side === 'side1') {
      const p1 = resolvedNames.s1p1 || 'Side 1';
      return isSingles ? p1 : `${p1} & ${resolvedNames.s1p2 || 'Player 2'}`;
    }
    const p1 = resolvedNames.s2p1 || 'Side 2';
    return isSingles ? p1 : `${p1} & ${resolvedNames.s2p2 || 'Player 2'}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          New {sport === 'tennis' ? 'Tennis' : 'Padel'} Match
        </Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Format Options Toggles */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={styles.checkboxItem}
            onPress={() => setCustomNames(!customNames)}
          >
            <Ionicons
              name={customNames ? "checkbox" : "square-outline"}
              size={22}
              color={theme.colors.accent.primary}
            />
            <Text style={styles.checkboxLabel}>{t('ui.customNames')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxItem}
            onPress={() => setIsSingles(!isSingles)}
          >
            <Ionicons
              name={isSingles ? "checkbox" : "square-outline"}
              size={22}
              color={theme.colors.accent.primary}
            />
            <Text style={styles.checkboxLabel}>{t('ui.singles')}</Text>
          </TouchableOpacity>
        </View>

        {/* Players Inputs Grid */}
        {customNames && (
          <View style={styles.playersGrid}>
            {/* Side 1 */}
            <View style={styles.sideColumn}>
              <Text style={styles.sideHeader}>Side 1 (Blue)</Text>
              <NameInput
                label="Player 1"
                value={side1P1}
                onChangeText={setSide1P1}
              />
              {!isSingles && (
                <NameInput
                  label="Player 2"
                  value={side1P2}
                  onChangeText={setSide1P2}
                />
              )}
            </View>

            {/* Swap Button */}
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={handleSwapSidesInput}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={24} color={theme.colors.accent.primary} />
            </TouchableOpacity>

            {/* Side 2 */}
            <View style={styles.sideColumn}>
              <Text style={styles.sideHeader}>Side 2 (Green)</Text>
              <NameInput
                label="Player 1"
                value={side2P1}
                onChangeText={setSide2P1}
              />
              {!isSingles && (
                <NameInput
                  label="Player 2"
                  value={side2P2}
                  onChangeText={setSide2P2}
                />
              )}
            </View>
          </View>
        )}

        {/* Who keeps score? */}
        <SideSelector
          title={t('ui.whoKeepsScore')}
          side1Label={getSideLabel('side1')}
          side2Label={getSideLabel('side2')}
          selectedSide={scoreKeeper}
          onSelectSide={setScoreKeeper}
        />

        {/* Who serves first? */}
        <SideSelector
          title={t('ui.whoServesFirst')}
          side1Label={getSideLabel('side1')}
          side2Label={getSideLabel('side2')}
          selectedSide={servingFirst}
          onSelectSide={setServingFirst}
        />

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStart}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>{t('ui.startMatch')}</Text>
          <Ionicons name="arrow-forward" size={22} color={theme.colors.bg.base} />
        </TouchableOpacity>
      </ScrollView>
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
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  settingsBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxLabel: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  playersGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sideColumn: {
    flex: 1,
    backgroundColor: theme.colors.bg.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  sideHeader: {
    color: theme.colors.accent.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  startBtn: {
    height: 56,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.lg,
    shadowColor: theme.colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnText: {
    color: theme.colors.bg.base,
    fontSize: 18,
    fontWeight: '800',
  },
});
