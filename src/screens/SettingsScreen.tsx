import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MatchConfig, SwapSidesRule, AppSettings } from '../engine/types';
import { theme } from '../styles/theme';
import { t } from '../i18n';

// The three ways to score 40:40 in FIP Rule 1, in the rulebook's own order.
// The engine stores them as two fields; naming them keeps the UI out of jargon.
type DeuceRule = 'tennis' | 'star' | 'golden';

const DEUCE_RULES: DeuceRule[] = ['tennis', 'star', 'golden'];

// Star Point plays two advantages before the deciding point; Golden Point none.
const ADVANTAGES_FOR_RULE: Record<DeuceRule, 0 | 2> = { tennis: 0, star: 2, golden: 0 };

function toDeuceRule(config: MatchConfig): DeuceRule {
  if (!config.goldenPointEnabled) return 'tennis';
  return config.advantagesBeforeGolden === 0 ? 'golden' : 'star';
}

interface SettingsScreenProps {
  visible: boolean;
  config: MatchConfig;
  appSettings: AppSettings;
  onClose: () => void;
  onUpdateConfig: (updated: Partial<MatchConfig>) => void;
  onUpdateAppSettings: (updated: Partial<AppSettings>) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  visible,
  config,
  appSettings,
  onClose,
  onUpdateConfig,
  onUpdateAppSettings,
}) => {
  const [deuceRule, setDeuceRule] = useState<DeuceRule>(toDeuceRule(config));
  const [tieBreak, setTieBreak] = useState(config.tieBreakEnabled);
  const [matchTieBreak, setMatchTieBreak] = useState(config.matchTieBreakEnabled);
  const [swapSides, setSwapSides] = useState<SwapSidesRule>(config.swapSides);
  const [totalSets, setTotalSets] = useState<1 | 3 | 5>(config.totalSets);

  // Re-sync the form each time the sheet opens; the config can have changed
  // (new match started, rules edited) while this component stayed mounted.
  useEffect(() => {
    if (!visible) return;
    setDeuceRule(toDeuceRule(config));
    setTieBreak(config.tieBreakEnabled);
    setMatchTieBreak(config.matchTieBreakEnabled);
    setSwapSides(config.swapSides);
    setTotalSets(config.totalSets);
  }, [visible, config]);

  const handleDone = () => {
    onUpdateConfig({
      goldenPointEnabled: deuceRule !== 'tennis',
      advantagesBeforeGolden: ADVANTAGES_FOR_RULE[deuceRule],
      tieBreakEnabled: tieBreak,
      matchTieBreakEnabled: matchTieBreak,
      swapSides,
      totalSets,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // Reachable from the landscape-locked score screen — see PlayersServingOverlay.
      supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
    >
      {/* A modal is its own native root, so it needs its own provider — without
          one the insets are all zero and the notch sits over the text when this
          opens in landscape from the score screen. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('ui.settings')}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>{t('ui.done')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Game Rules Section */}
          <Text style={styles.sectionHeader}>Game Settings</Text>
          <View style={styles.cardGroup}>
            {/* What happens at 40:40 — star point and golden point are padel
                rules, so tennis matches simply play advantages. */}
            {config.sport === 'padel' && (
            <View style={styles.rowSubSection}>
              <Text style={styles.rowLabel}>{t('ui.deuceRule')}</Text>
              {DEUCE_RULES.map((rule) => {
                const selected = deuceRule === rule;
                return (
                  <TouchableOpacity
                    key={rule}
                    style={[styles.optionRow, selected && styles.optionRowActive]}
                    onPress={() => setDeuceRule(rule)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={selected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={selected ? theme.colors.accent.primary : theme.colors.text.muted}
                    />
                    <View style={styles.optionTextCol}>
                      <Text style={[styles.optionTitle, selected && styles.optionTitleActive]}>
                        {t(`ui.deuce_${rule}`)}
                      </Text>
                      <Text style={styles.optionHint}>{t(`ui.deuce_${rule}_hint`)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            )}

            {/* Tie-Break Toggle */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('ui.tieBreak')}</Text>
              <Switch
                value={tieBreak}
                onValueChange={setTieBreak}
                trackColor={{ false: theme.colors.bg.surface, true: theme.colors.accent.primary }}
              />
            </View>

            {/* Match Tie-Break */}
            <View style={styles.row}>
              <View style={styles.labelCol}>
                <Text style={styles.rowLabel}>{t('ui.matchTieBreak')}</Text>
                <Text style={styles.rowSubLabel}>Super tie-break to 10 in final set</Text>
              </View>
              <Switch
                value={matchTieBreak}
                onValueChange={setMatchTieBreak}
                trackColor={{ false: theme.colors.bg.surface, true: theme.colors.accent.primary }}
              />
            </View>

            {/* Swap Sides Rule */}
            <View style={styles.rowSubSection}>
              <Text style={styles.rowLabel}>{t('ui.autoSwapSides')}</Text>
              <Text style={styles.rowSubLabel}>{t('ui.autoSwapSidesHint')}</Text>
              <View style={styles.segmentedRow}>
                {(['off', 'oddGames', 'everySet'] as const).map((rule) => {
                  const labels = { off: 'Off', oddGames: 'Odd Games', everySet: 'Every Set' };
                  return (
                    <TouchableOpacity
                      key={rule}
                      style={[
                        styles.segmentBtn,
                        swapSides === rule && styles.segmentBtnActive,
                      ]}
                      onPress={() => setSwapSides(rule)}
                    >
                      <Text
                        style={[
                          styles.segmentBtnText,
                          swapSides === rule && styles.segmentBtnTextActive,
                        ]}
                      >
                        {labels[rule]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sets in Match Stepper */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('ui.setsInMatch')}</Text>
              <View style={styles.stepperRow}>
                {([1, 3, 5] as const).map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.stepperBtn,
                      totalSets === val && styles.stepperBtnActive,
                    ]}
                    onPress={() => setTotalSets(val)}
                  >
                    <Text
                      style={[
                        styles.stepperText,
                        totalSets === val && styles.stepperTextActive,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Display & Sound Section */}
          <Text style={styles.sectionHeader}>Display & Sound</Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('ui.maxBrightness')}</Text>
              <Switch
                value={appSettings.maxBrightness}
                onValueChange={(v) => onUpdateAppSettings({ maxBrightness: v })}
                trackColor={{ false: theme.colors.bg.surface, true: theme.colors.accent.primary }}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('ui.scoreAnnouncements')}</Text>
              <Switch
                value={appSettings.voiceAnnounce}
                onValueChange={(v) => onUpdateAppSettings({ voiceAnnounce: v })}
                trackColor={{ false: theme.colors.bg.surface, true: theme.colors.accent.primary }}
              />
            </View>

          </View>
        </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  headerTitle: {
    color: theme.colors.text.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: theme.colors.accent.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  doneBtnText: {
    color: theme.colors.bg.base,
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  cardGroup: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    paddingHorizontal: theme.spacing.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  labelCol: {
    flex: 1,
    paddingRight: 10,
  },
  rowLabel: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    backgroundColor: theme.colors.bg.elevated,
  },
  optionRowActive: {
    borderColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.accent.primaryGlow,
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitle: {
    color: theme.colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: theme.colors.accent.primary,
  },
  optionHint: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  rowSubSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg.elevated,
    borderRadius: theme.radius.md,
    padding: 3,
    marginTop: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.accent.primary,
  },
  segmentBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    color: theme.colors.bg.base,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.bg.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  stepperBtnActive: {
    backgroundColor: theme.colors.accent.primary,
    borderColor: theme.colors.accent.primary,
  },
  stepperText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepperTextActive: {
    color: theme.colors.bg.base,
  },
});
