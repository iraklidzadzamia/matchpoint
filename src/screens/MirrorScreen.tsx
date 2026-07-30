import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { MatchState, PlayerSide } from '../engine/types';
import { getDisplayScore } from '../engine/scoring';
import { ConnectionState } from '../link/protocol';
import { SetScoreBar } from '../components/SetScoreBar';
import { PlayerZone } from '../components/PlayerZone';
import { useLandscapeOrientation } from '../hooks/useOrientation';
import { useMaxBrightness } from '../hooks/useMaxBrightness';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface MirrorScreenProps {
  state: MatchState;
  /** Whether the scoreboard is still reachable — see the note on going stale. */
  connection: ConnectionState;
  maxBrightness: boolean;
  onLeave: () => void;
}

/**
 * The same scoreboard, on a second phone.
 *
 * It stands at the far end of the court and gets looked at exactly like the one
 * keeping score, so it shows the same thing: big score, sets, names, who is
 * serving. Landscape, awake and bright for the same reasons.
 *
 * What it must never do is change anything. No tap zones, no settings, no undo —
 * and not by disabling them: `PlayerZone` is handed no handler, so there is no
 * touchable to press. The only control is leaving.
 *
 * **It has to admit when it stops knowing.** Points arrive only while the
 * scoreboard is connected, and a mirror that keeps showing the last score it
 * received looks exactly like a mirror that is up to date. That is worse than a
 * blank screen: the whole court reads it and plays on a score that quietly
 * stopped being true. So losing the connection dims the score and says so.
 *
 * It stays silent too. The phone keeping score announces; two devices twenty
 * metres apart saying the same thing arrive far enough apart to be heard as an
 * echo, whatever the software does about timing.
 */
export const MirrorScreen: React.FC<MirrorScreenProps> = ({
  state,
  connection,
  maxBrightness,
  onLeave,
}) => {
  useLandscapeOrientation();
  useKeepAwake();
  useMaxBrightness(maxBrightness);

  const display = getDisplayScore(state);

  const isSwapped = state.courtSide === 'swapped';
  const leftSide: PlayerSide = isSwapped ? 'side2' : 'side1';
  const rightSide: PlayerSide = isSwapped ? 'side1' : 'side2';

  const isLive = connection === 'connected';
  // Worth keeping apart: one is a gap that usually closes by itself, the other
  // is the scoreboard being gone.
  const isReconnecting = connection === 'connecting';

  const statusColor = isLive
    ? theme.colors.text.muted
    : isReconnecting
      ? theme.colors.status.warning
      : theme.colors.status.error;

  const statusLabel = isLive
    ? t('ui.mirroring')
    : isReconnecting
      ? t('ui.mirrorReconnecting')
      : t('ui.mirrorLost');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />

      <View style={!isLive && styles.stale}>
        <SetScoreBar state={state} />
      </View>

      <View style={[styles.zonesContainer, !isLive && styles.stale]}>
        <PlayerZone
          side={leftSide}
          score={isSwapped ? display.side2Score : display.side1Score}
          isServing={state.serving === leftSide}
          align="left"
        />

        <View style={styles.zoneSeparator} />

        <PlayerZone
          side={rightSide}
          score={isSwapped ? display.side1Score : display.side2Score}
          isServing={state.serving === rightSide}
          align="right"
        />
      </View>

      {!isLive && !isReconnecting && (
        <View style={styles.lostBanner}>
          <Ionicons name="warning-outline" size={16} color={theme.colors.status.error} />
          <Text style={styles.lostText}>{t('ui.mirrorLostHint')}</Text>
        </View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.leaveBtn} onPress={onLeave}>
          <Ionicons name="close" size={18} color={theme.colors.text.secondary} />
          <Text style={styles.leaveText}>{t('ui.stopMirroring')}</Text>
        </TouchableOpacity>

        <View style={styles.mirrorTag}>
          <Ionicons
            name={isLive ? 'phone-portrait-outline' : 'cloud-offline-outline'}
            size={13}
            color={statusColor}
          />
          <Text style={[styles.mirrorTagText, { color: statusColor }]}>{statusLabel}</Text>
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
  zonesContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  // Dimmed rather than hidden: the last known score is still the most useful
  // thing on the screen, as long as nobody mistakes it for a live one.
  stale: {
    opacity: 0.35,
  },
  zoneSeparator: {
    width: 1,
    backgroundColor: theme.colors.glass.border,
    marginVertical: theme.spacing.xl,
  },
  lostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.status.error,
    backgroundColor: theme.colors.glass.bg,
  },
  lostText: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  leaveText: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '700',
  },
  mirrorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mirrorTagText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
