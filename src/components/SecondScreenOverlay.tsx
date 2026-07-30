import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ConnectionState } from '../link/protocol';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface SecondScreenOverlayProps {
  visible: boolean;
  hosting: boolean;
  code: string | null;
  connection: ConnectionState;
  onToggleHosting: (hosting: boolean) => void;
  onClose: () => void;
}

/**
 * Shows the four-digit code that identifies this match to another phone.
 *
 * The code is the whole reason this screen exists. Two groups on neighbouring
 * courts can be running matches with the same names, so the person joining has
 * to read the code off the scoreboard rather than guess from a list.
 */
export const SecondScreenOverlay: React.FC<SecondScreenOverlayProps> = ({
  visible,
  hosting,
  code,
  connection,
  onToggleHosting,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
    // Opened from the landscape-locked score screen — see PlayersServingOverlay.
    supportedOrientations={['portrait', 'landscape', 'landscape-left', 'landscape-right']}
  >
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('ui.secondScreen')}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>{t('ui.done')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {hosting ? (
            <>
              <Text style={styles.codeLabel}>{t('ui.matchCode')}</Text>
              <Text style={styles.code}>{code ?? '----'}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        connection === 'connected'
                          ? theme.colors.accent.primary
                          : theme.colors.text.muted,
                    },
                  ]}
                />
                <Text style={styles.status}>
                  {connection === 'connected' ? t('ui.deviceConnected') : t('ui.waitingForDevice')}
                </Text>
              </View>
              <Text style={styles.hint}>{t('ui.secondScreenHint')}</Text>

              <TouchableOpacity style={styles.stopBtn} onPress={() => onToggleHosting(false)}>
                <Text style={styles.stopBtnText}>{t('ui.stopSharing')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Ionicons
                name="phone-portrait-outline"
                size={40}
                color={theme.colors.text.muted}
              />
              <Text style={styles.hint}>{t('ui.secondScreenIdle')}</Text>
              <TouchableOpacity style={styles.startBtn} onPress={() => onToggleHosting(true)}>
                <Text style={styles.startBtnText}>{t('ui.startSharing')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  </Modal>
);

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
    fontSize: 22,
    fontWeight: '900',
  },
  doneBtn: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.full,
  },
  doneBtnText: {
    color: theme.colors.bg.base,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  codeLabel: {
    color: theme.colors.text.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  code: {
    color: theme.colors.text.primary,
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: theme.colors.text.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
  },
  startBtn: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 14,
    backgroundColor: theme.colors.accent.primary,
    borderRadius: theme.radius.lg,
  },
  startBtnText: {
    color: theme.colors.bg.base,
    fontSize: 17,
    fontWeight: '800',
  },
  stopBtn: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  stopBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
});
