import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Sport, MatchConfig, PlayerSide, MatchFormat, MatchRecord } from '../engine/types';
import { groupIntoSessions, DEFAULT_SESSION_GAP_SEC } from '../engine/sessions';
import { suggestNextMatch, sittingOut } from '../engine/nextMatch';
import { NameInput } from '../components/NameInput';
import { SideSelector } from '../components/SideSelector';
import { Segmented } from '../components/Segmented';
import { SwipeBackView } from '../components/SwipeBackView';
import { theme } from '../styles/theme';
import { usePortraitOrientation } from '../hooks/useOrientation';
import {
  loadLastPlayers,
  saveLastPlayers,
  loadRoster,
  addToRoster,
  loadPresent,
  savePresent,
  loadHistory,
} from '../storage/matchStorage';
import { t } from '../i18n';

interface MatchSetupScreenProps {
  baseConfig: MatchConfig;
  onBack: () => void;
  onStartMatch: (config: MatchConfig) => void;
  onOpenSettings: () => void;
}

export const MatchSetupScreen: React.FC<MatchSetupScreenProps> = ({
  baseConfig,
  onBack,
  onStartMatch,
  onOpenSettings,
}) => {
  usePortraitOrientation();

  // Sport changes no rules — those all live in Settings — so it is just a
  // label kept for the history list.
  const [sport, setSport] = useState<Sport>(baseConfig.sport);
  const [isSingles, setIsSingles] = useState<boolean>(baseConfig.format === 'singles');

  // Blank to start; filled in below from the last match if there was one. A
  // placeholder is clearer than a sample name you might start a real match with.
  const [side1P1, setSide1P1] = useState('');
  const [side1P2, setSide1P2] = useState('');
  const [side2P1, setSide2P1] = useState('');
  const [side2P2, setSide2P2] = useState('');

  useEffect(() => {
    loadLastPlayers().then((players) => {
      if (!players) return;
      setSide1P1(players.side1[0]);
      setSide1P2(players.side1[1]);
      setSide2P1(players.side2[0]);
      setSide2P2(players.side2[1]);
    });
  }, []);

  const [servingFirst, setServingFirst] = useState<PlayerSide>('side1');

  // Everyone the app has seen, who of them turned up today, and what today has
  // already played — enough to tap a name instead of typing it and to notice who
  // has been sitting down all evening.
  const [roster, setRoster] = useState<string[]>([]);
  const [present, setPresent] = useState<string[]>([]);
  const [sessionMatches, setSessionMatches] = useState<MatchRecord[]>([]);

  useEffect(() => {
    async function load() {
      const [names, here, history] = await Promise.all([
        loadRoster(),
        loadPresent(DEFAULT_SESSION_GAP_SEC),
        loadHistory(),
      ]);
      setRoster(names);
      setPresent(here);
      // Only today's outing matters for who has waited longest.
      setSessionMatches(groupIntoSessions(history)[0]?.matches ?? []);
    }
    load();
  }, []);

  const slots: Array<[string, (v: string) => void]> = isSingles
    ? [[side1P1, setSide1P1], [side2P1, setSide2P1]]
    : [
        [side1P1, setSide1P1],
        [side1P2, setSide1P2],
        [side2P1, setSide2P1],
        [side2P2, setSide2P2],
      ];

  const assigned = slots.map(([value]) => value.trim()).filter(Boolean);

  const togglePresent = (name: string) => {
    const next = present.includes(name)
      ? present.filter((n) => n !== name)
      : [...present, name];
    setPresent(next);
    savePresent(next);
  };

  /** Drops a tapped name into the first empty slot, or clears it if already in one. */
  const assign = (name: string) => {
    const existing = slots.find(([value]) => value.trim() === name);
    if (existing) {
      existing[1]('');
      return;
    }
    const empty = slots.find(([value]) => value.trim() === '');
    if (empty) empty[1](name);
  };

  const applySuggestion = () => {
    const suggestion = suggestNextMatch(
      sessionMatches,
      present,
      isSingles ? 'singles' : 'doubles'
    );
    if (!suggestion) return;
    const names = [...suggestion.side1, ...suggestion.side2];
    slots.forEach(([, set], i) => set(names[i] ?? ''));
  };

  const waiting = sittingOut(sessionMatches, present);
  const [editingPresent, setEditingPresent] = useState(false);

  const handleSwapSidesInput = () => {
    setSide1P1(side2P1);
    setSide1P2(side2P2);
    setSide2P1(side1P1);
    setSide2P2(side1P2);
  };

  const resolvedNames = {
    s1p1: side1P1.trim(),
    s1p2: side1P2.trim(),
    s2p1: side2P1.trim(),
    s2p2: side2P2.trim(),
  };

  // With nothing typed for a side, name it "Side 1" rather than inventing a
  // partner — "Side 1 & Player 2" would follow the match into its history.
  const buildSide = (side: PlayerSide) => {
    const [p1, p2] =
      side === 'side1'
        ? [resolvedNames.s1p1, resolvedNames.s1p2]
        : [resolvedNames.s2p1, resolvedNames.s2p2];
    const fallback = side === 'side1' ? 'Side 1' : 'Side 2';

    if (isSingles) return { player1: p1 || fallback };
    if (!p1 && !p2) return { player1: fallback };
    return { player1: p1 || 'Player 1', player2: p2 || 'Player 2' };
  };

  const handleStart = () => {
    const format: MatchFormat = isSingles ? 'singles' : 'doubles';

    const config: MatchConfig = {
      ...baseConfig,
      sport,
      format,
      // Star point and golden point are padel rules; tennis plays advantages.
      goldenPointEnabled: sport === 'padel' ? baseConfig.goldenPointEnabled : false,
      side1: buildSide('side1'),
      side2: buildSide('side2'),
      servingFirst,
    };

    saveLastPlayers({
      side1: [resolvedNames.s1p1, resolvedNames.s1p2],
      side2: [resolvedNames.s2p1, resolvedNames.s2p2],
    });

    // Anyone who played is somebody to tap next time, and is obviously here.
    const played = Object.values(resolvedNames).filter(Boolean);
    addToRoster(played);
    savePresent([...new Set([...present, ...played])]);
    onStartMatch(config);
  };

  const getSideLabel = (side: PlayerSide) => {
    const [p1, p2] =
      side === 'side1'
        ? [resolvedNames.s1p1, resolvedNames.s1p2]
        : [resolvedNames.s2p1, resolvedNames.s2p2];
    const fallback = side === 'side1' ? 'Side 1' : 'Side 2';

    if (isSingles) return p1 || fallback;
    // With no names entered, "Side 1" beats stitching together a half-real
    // pair like "Side 1 & Player 2".
    if (!p1 && !p2) return fallback;
    return `${p1 || 'Player 1'} & ${p2 || 'Player 2'}`;
  };

  return (
    <SwipeBackView onBack={onBack}>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('ui.newMatch')}</Text>
        <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings}>
          <Ionicons name="settings-outline" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Segmented
          options={[
            { value: 'tennis', label: t('ui.tennis') },
            { value: 'padel', label: t('ui.padel') },
          ]}
          value={sport}
          onChange={setSport}
        />

        <Segmented
          options={[
            { value: 'singles', label: t('ui.singles') },
            { value: 'doubles', label: t('ui.doubles') },
          ]}
          value={isSingles ? 'singles' : 'doubles'}
          onChange={(v) => setIsSingles(v === 'singles')}
        />

        {/* One row of names, not two. Tapping a name puts it on court; who turned
            up at all is edited behind a button, because it changes once an evening
            while the sides change every match. */}
        <Text style={styles.sectionLabel}>{t('ui.players')}</Text>

        {roster.length > 0 && (
          <View style={styles.assignRow}>
            <View style={styles.chipRow}>
              {(editingPresent ? roster : present).map((name) => {
                const inMatch = assigned.includes(name);
                const here = present.includes(name);
                const active = editingPresent ? here : inMatch;
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => (editingPresent ? togglePresent(name) : assign(name))}
                    activeOpacity={0.7}
                  >
                    {!editingPresent && !inMatch && (
                      <Ionicons name="add" size={14} color={theme.colors.text.secondary} />
                    )}
                    {editingPresent && here && (
                      <Ionicons name="checkmark" size={14} color={theme.colors.accent.primary} />
                    )}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.chipRow}>
              <TouchableOpacity
                style={styles.plainBtn}
                onPress={() => setEditingPresent(!editingPresent)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={editingPresent ? 'checkmark' : 'people-outline'}
                  size={16}
                  color={theme.colors.text.secondary}
                />
                <Text style={styles.plainBtnText}>
                  {editingPresent ? t('ui.done') : t('ui.whoIsHere')}
                </Text>
              </TouchableOpacity>

              {!editingPresent && present.length >= (isSingles ? 2 : 4) && (
                <TouchableOpacity style={styles.suggestBtn} onPress={applySuggestion} activeOpacity={0.7}>
                  <Ionicons name="shuffle" size={16} color={theme.colors.accent.primary} />
                  <Text style={styles.suggestText}>{t('ui.suggest')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {!editingPresent && waiting.length > 0 && present.length > (isSingles ? 2 : 4) && (
              <Text style={styles.waitingNote}>
                {t('ui.notPlayedYet', { names: waiting.join(', ') })}
              </Text>
            )}
          </View>
        )}

        {roster.length === 0 && <Text style={styles.sectionLabel}>{t('ui.players')}</Text>}

        <View style={styles.sideCard}>
          <View style={styles.sideHeaderRow}>
            <View style={[styles.sideDot, { backgroundColor: theme.colors.side1.base }]} />
            <Text style={[styles.sideHeader, { color: theme.colors.side1.base }]}>Side 1</Text>
          </View>
          <NameInput side="side1" value={side1P1} onChangeText={setSide1P1} placeholder="Player 1" />
          {!isSingles && (
            <NameInput side="side1" value={side1P2} onChangeText={setSide1P2} placeholder="Player 2" />
          )}
        </View>

        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <TouchableOpacity style={styles.swapBtn} onPress={handleSwapSidesInput} activeOpacity={0.7}>
            <Ionicons name="swap-vertical" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.swapBtnText}>{t('ui.swapSides')}</Text>
          </TouchableOpacity>
          <View style={styles.swapLine} />
        </View>

        <View style={styles.sideCard}>
          <View style={styles.sideHeaderRow}>
            <View style={[styles.sideDot, { backgroundColor: theme.colors.side2.base }]} />
            <Text style={[styles.sideHeader, { color: theme.colors.side2.base }]}>Side 2</Text>
          </View>
          <NameInput side="side2" value={side2P1} onChangeText={setSide2P1} placeholder="Player 1" />
          {!isSingles && (
            <NameInput side="side2" value={side2P2} onChangeText={setSide2P2} placeholder="Player 2" />
          )}
        </View>

        {/* Who serves first? */}
        <SideSelector
          title={t('ui.whoServesFirst')}
          side1Label={getSideLabel('side1')}
          side2Label={getSideLabel('side2')}
          selectedSide={servingFirst}
          onSelectSide={setServingFirst}
        />

      </ScrollView>

      {/* Pinned so the primary action is always reachable, however long the form */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>{t('ui.startMatch')}</Text>
          <Ionicons name="arrow-forward" size={22} color={theme.colors.bg.base} />
        </TouchableOpacity>
      </View>
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
  sectionLabel: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    backgroundColor: theme.colors.bg.surface,
  },
  chipActive: {
    borderColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.accent.primaryGlow,
  },
  chipText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.accent.primary,
  },
  plainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  plainBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  waitingNote: {
    color: theme.colors.text.muted,
    fontSize: 13,
    marginTop: 8,
  },
  assignRow: {
    gap: 10,
    marginBottom: theme.spacing.xs,
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.accent.primary,
  },
  suggestText: {
    color: theme.colors.accent.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sideCard: {
    backgroundColor: theme.colors.bg.surface,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  sideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sideDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  sideHeader: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.glass.border,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.bg.surface,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  swapBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.glass.border,
    backgroundColor: theme.colors.bg.base,
  },
  startBtn: {
    height: 58,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
