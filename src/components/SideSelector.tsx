import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';

interface SideSelectorProps {
  title: string;
  side1Label: string;
  side2Label: string;
  selectedSide: PlayerSide;
  onSelectSide: (side: PlayerSide) => void;
}

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
        <TouchableOpacity
          style={[
            styles.button,
            selectedSide === 'side1' && styles.buttonSelectedSide1,
          ]}
          onPress={() => onSelectSide('side1')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              selectedSide === 'side1' && styles.buttonTextSelected,
            ]}
            numberOfLines={2}
          >
            {side1Label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            selectedSide === 'side2' && styles.buttonSelectedSide2,
          ]}
          onPress={() => onSelectSide('side2')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.buttonText,
              selectedSide === 'side2' && styles.buttonTextSelected,
            ]}
            numberOfLines={2}
          >
            {side2Label}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
    height: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.bg.surface,
    borderWidth: 2,
    borderColor: theme.colors.glass.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  buttonSelectedSide1: {
    borderColor: theme.colors.side1.base,
    backgroundColor: theme.colors.side1.glow,
  },
  buttonSelectedSide2: {
    borderColor: theme.colors.accent.primary,
    backgroundColor: theme.colors.accent.primaryGlow,
  },
  buttonText: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextSelected: {
    color: theme.colors.text.primary,
    fontWeight: '700',
  },
});
