import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MatchState } from '../engine/types';
import { getDisplayScore, getSideNames } from '../engine/scoring';
import { MatchLink } from '../link/matchLink';
import { MultipeerTransport } from '../link/multipeerTransport';
import { PeerInfo } from '../link/protocol';
import { SwipeBackView } from '../components/SwipeBackView';
import { usePortraitOrientation } from '../hooks/useOrientation';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface JoinScreenProps {
  onBack: () => void;
}

/**
 * Joins somebody else's match as a second screen.
 *
 * The list shows each match with a four-digit code, and the same code is on the
 * screen of the phone keeping score. That is the whole point: with two groups on
 * neighbouring courts, both matches can genuinely be called the same thing, so
 * the code is what makes the choice certain.
 */
export const JoinScreen: React.FC<JoinScreenProps> = ({ onBack }) => {
  usePortraitOrientation();

  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [joined, setJoined] = useState<MatchState | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const link = useRef<MatchLink | null>(null);

  useEffect(() => {
    if (!MultipeerTransport.available) return;

    const created = new MatchLink(new MultipeerTransport(), 'display');
    created.onPeers = setPeers;
    created.onState = setJoined;
    created.browse();
    link.current = created;

    return () => {
      void created.leave();
      link.current = null;
    };
  }, []);

  const score = useMemo(() => (joined ? getDisplayScore(joined) : null), [joined]);

  const join = async (peer: PeerInfo) => {
    setJoining(peer.id);
    await link.current?.join(peer.id);
  };

  return (
    <SwipeBackView onBack={onBack}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onBack}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('ui.joinMatch')}</Text>
          <View style={styles.headerBtn} />
        </View>

        {joined && score ? (
          <View style={styles.live}>
            <Text style={styles.liveName}>{getSideNames(joined.config, 'side1')}</Text>
            <Text style={styles.liveScore}>
              {score.side1Score} – {score.side2Score}
            </Text>
            <Text style={styles.liveName}>{getSideNames(joined.config, 'side2')}</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {peers.length === 0 ? (
              <View style={styles.searching}>
                <ActivityIndicator color={theme.colors.text.muted} />
                <Text style={styles.searchingText}>{t('ui.lookingForMatches')}</Text>
                <Text style={styles.hint}>{t('ui.joinHint')}</Text>
              </View>
            ) : (
              peers.map((peer) => (
                <TouchableOpacity
                  key={peer.id}
                  style={styles.peer}
                  onPress={() => join(peer)}
                  activeOpacity={0.8}
                  disabled={joining !== null}
                >
                  <View style={styles.peerText}>
                    <Text style={styles.peerName} numberOfLines={1}>
                      {peer.name}
                    </Text>
                    <Text style={styles.peerCode}>{peer.code}</Text>
                  </View>
                  {joining === peer.id ? (
                    <ActivityIndicator color={theme.colors.accent.primary} />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.colors.text.muted}
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
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
    gap: theme.spacing.sm,
  },
  searching: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
  searchingText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
  },
  hint: {
    color: theme.colors.text.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: theme.spacing.lg,
  },
  peer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
  },
  peerText: {
    flex: 1,
    gap: 2,
  },
  peerName: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  peerCode: {
    color: theme.colors.text.muted,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  live: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  liveName: {
    color: theme.colors.text.secondary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  liveScore: {
    color: theme.colors.text.primary,
    fontSize: 72,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
