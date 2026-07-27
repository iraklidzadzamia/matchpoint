import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MatchState, PlayerSide } from '../engine/types';
import { getSideNames } from '../engine/scoring';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface PlayersServingOverlayProps {
  visible: boolean;
  state: MatchState;
  onClose: () => void;
  onSelectServer: (side: PlayerSide, playerIndex: 0 | 1) => void;
}

export const PlayersServingOverlay: React.FC<PlayersServingOverlayProps> = ({
  visible,
  state,
  onClose,
  onSelectServer,
}) => {
  const side1 = state.config.side1;
  const side2 = state.config.side2;
  const isDoubles = state.config.format === 'doubles';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('ui.playersAndServing')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Select Current Server:</Text>

          {/* Side 1 Players */}
          <View style={styles.sideBlock}>
            <Text style={styles.sideName}>{getSideNames(state.config, 'side1')}</Text>
            
            <TouchableOpacity
              style={[
                styles.playerRow,
                state.serving === 'side1' && state.serverPlayerIndex[0] === 0 && styles.activePlayerRow,
              ]}
              onPress={() => onSelectServer('side1', 0)}
            >
              <Ionicons
                name={state.serving === 'side1' && state.serverPlayerIndex[0] === 0 ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={theme.colors.accent.primary}
              />
              <Text style={styles.playerText}>{side1.player1}</Text>
            </TouchableOpacity>

            {isDoubles && side1.player2 && (
              <TouchableOpacity
                style={[
                  styles.playerRow,
                  state.serving === 'side1' && state.serverPlayerIndex[0] === 1 && styles.activePlayerRow,
                ]}
                onPress={() => onSelectServer('side1', 1)}
              >
                <Ionicons
                  name={state.serving === 'side1' && state.serverPlayerIndex[0] === 1 ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={theme.colors.accent.primary}
                />
                <Text style={styles.playerText}>{side1.player2}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Side 2 Players */}
          <View style={styles.sideBlock}>
            <Text style={styles.sideName}>{getSideNames(state.config, 'side2')}</Text>
            
            <TouchableOpacity
              style={[
                styles.playerRow,
                state.serving === 'side2' && state.serverPlayerIndex[1] === 0 && styles.activePlayerRow,
              ]}
              onPress={() => onSelectServer('side2', 0)}
            >
              <Ionicons
                name={state.serving === 'side2' && state.serverPlayerIndex[1] === 0 ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={theme.colors.accent.primary}
              />
              <Text style={styles.playerText}>{side2.player1}</Text>
            </TouchableOpacity>

            {isDoubles && side2.player2 && (
              <TouchableOpacity
                style={[
                  styles.playerRow,
                  state.serving === 'side2' && state.serverPlayerIndex[1] === 1 && styles.activePlayerRow,
                ]}
                onPress={() => onSelectServer('side2', 1)}
              >
                <Ionicons
                  name={state.serving === 'side2' && state.serverPlayerIndex[1] === 1 ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={theme.colors.accent.primary}
                />
                <Text style={styles.playerText}>{side2.player2}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>{t('ui.done')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: theme.colors.bg.elevated,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  sectionTitle: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  sideBlock: {
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sideName: {
    color: theme.colors.accent.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glass.border,
  },
  activePlayerRow: {
    backgroundColor: theme.colors.accent.primaryGlow,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 8,
  },
  playerText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: theme.colors.accent.primary,
    height: 48,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  doneBtnText: {
    color: theme.colors.bg.base,
    fontSize: 16,
    fontWeight: '700',
  },
});
