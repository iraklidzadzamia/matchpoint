import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A binary choice between two named things reads far better as a segmented
 * control than as a checkbox for one of them.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && styles.segmentActive]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, selected && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    padding: 4,
    marginBottom: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: theme.radius.full,
  },
  segmentActive: {
    backgroundColor: theme.colors.accent.primary,
  },
  label: {
    color: theme.colors.text.secondary,
    fontSize: 15,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.colors.bg.base,
    fontWeight: '800',
  },
});
