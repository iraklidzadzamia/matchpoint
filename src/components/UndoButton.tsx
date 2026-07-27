import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface UndoButtonProps {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const UndoButton: React.FC<UndoButtonProps> = ({ onPress, disabled = false, style }) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.disabledButton,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name="arrow-undo" size={24} color={disabled ? theme.colors.text.muted : theme.colors.bg.base} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: theme.colors.bg.surface,
    borderColor: theme.colors.glass.border,
    borderWidth: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
});
