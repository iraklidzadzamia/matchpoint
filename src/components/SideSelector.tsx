import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';

interface SideSelectorProps {
  title: string;
  side1Label: string;
  side2Label: string;
  selectedSide: PlayerSide;
  onSelectSide: (side: PlayerSide) => void;
}

const OPTIONS: PlayerSide[] = ['side1', 'side2'];

export const SideSelector: React.FC<SideSelectorProps> = ({
  title,
  side1Label,
  side2Label,
  selectedSide,
  onSelectSide,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.buttonsRow}>
        {OPTIONS.map((side) => {
          const selected = selectedSide === side;
          // Same blue / green the players will see on court during the match.
          const palette = side === 'side1' ? theme.colors.side1 : theme.colors.side2;

          return (
            <TouchableOpacity
              key={side}
              style={[
                styles.button,
                selected && { borderColor: palette.base, backgroundColor: palette.glow },
              ]}
              onPress={() => onSelectSide(side)}
              activeOpacity={0.8}
            >
              <View style={styles.buttonInner}>
                <View style={[styles.dot, { backgroundColor: palette.base }]} />
                <Text
                  style={[styles.buttonText, selected && styles.buttonTextSelected]}
                  numberOfLines={2}
                >
                  {side === 'side1' ? side1Label : side2Label}
                </Text>
              </View>
              {selected && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color={palette.base}
                  style={styles.check}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.glass.border,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  buttonText: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSelected: {
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});
