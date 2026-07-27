import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../styles/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  borderColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, style, borderColor }) => {
  return (
    <View style={[styles.card, borderColor ? { borderColor } : null, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.glass.cardBg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: theme.spacing.md,
    overflow: 'hidden',
  },
});
