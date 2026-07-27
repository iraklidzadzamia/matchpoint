import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';
import { scoreAnnouncer } from '../audio/scoreAnnouncer';
import { t } from '../i18n';

interface NameInputProps {
  side: PlayerSide;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const NameInput: React.FC<NameInputProps> = ({
  side,
  value,
  onChangeText,
  placeholder = 'Name',
}) => {
  const [focused, setFocused] = useState(false);
  const palette = side === 'side1' ? theme.colors.side1 : theme.colors.side2;
  const initial = value.trim().charAt(0).toUpperCase();

  const handleTestVoice = () => {
    if (value.trim()) {
      scoreAnnouncer.testVoice(value.trim());
    }
  };

  return (
    <View
      style={[
        styles.row,
        { borderColor: focused ? palette.base : theme.colors.glass.border },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: palette.glow }]}>
        <Text style={[styles.avatarText, { color: palette.base }]}>{initial || '?'}</Text>
      </View>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCorrect={false}
        returnKeyType="done"
      />

      <TouchableOpacity
        style={styles.testBtn}
        onPress={handleTestVoice}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="volume-medium" size={16} color={theme.colors.text.secondary} />
        <Text style={styles.testBtnText}>{t('ui.testVoice')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.bg.base,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 0,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.glass.bg,
  },
  testBtnText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
