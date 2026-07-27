import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { scoreAnnouncer } from '../audio/scoreAnnouncer';
import { t } from '../i18n';

interface NameInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const NameInput: React.FC<NameInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder = 'Name',
}) => {
  const handleTestVoice = () => {
    if (value.trim()) {
      scoreAnnouncer.testVoice(value.trim());
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestVoice}
          activeOpacity={0.7}
        >
          <Ionicons name="volume-high-outline" size={18} color={theme.colors.accent.primary} />
          <Text style={styles.testBtnText}>{t('ui.testVoice')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  testBtnText: {
    color: theme.colors.accent.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
