import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';
import { t } from '../i18n';

interface PlayerZoneProps {
  side: PlayerSide;
  score: string;
  isServing: boolean;
  /** Which half of the screen this zone occupies, so the ball can sit on the outer edge. */
  align: 'left' | 'right';
  onTap: (side: PlayerSide) => void;
  showTapHint?: boolean;
}

export const PlayerZone: React.FC<PlayerZoneProps> = ({
  side,
  score,
  isServing,
  align,
  onTap,
  showTapHint = false,
}) => {
  const flashAnim = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    // Trigger animated color flash
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: false,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();

    onTap(side);
  };

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'transparent',
      side === 'side1' ? theme.colors.side1.flash : theme.colors.side2.flash,
    ],
  });

  return (
    <TouchableOpacity
      style={styles.zoneContainer}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      <Animated.View style={[styles.flashOverlay, { backgroundColor: flashBg }]} />

      {/* The ball rides the outer top corner of the number, so it reads in the
          same glance as the score and never overlaps the centre divider. */}
      <View style={styles.scoreWrap}>
        <Text style={styles.scoreText} numberOfLines={1} adjustsFontSizeToFit>
          {score}
        </Text>
        {isServing && (
          <View style={[styles.ballBadge, align === 'left' ? styles.ballLeft : styles.ballRight]}>
            <Ionicons name="tennisball" size={46} color={theme.colors.accent.ball} />
          </View>
        )}
      </View>

      {showTapHint && (
        <View style={styles.hintContainer}>
          <Ionicons name="hand-left-outline" size={14} color={theme.colors.text.secondary} />
          <Text style={styles.hintText}>{t('ui.tapToScore')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  zoneContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: theme.radius.lg,
  },
  scoreWrap: {
    position: 'relative',
  },
  ballBadge: {
    position: 'absolute',
    top: 4,
  },
  ballLeft: {
    left: -34,
  },
  ballRight: {
    right: -34,
  },
  scoreText: {
    // adjustsFontSizeToFit shrinks this when the value is wide, so it can be
    // sized for the common single digit rather than the worst case.
    fontSize: 190,
    lineHeight: 200,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: -4,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  // Sits below the number rather than over it, so the score is never covered.
  hintContainer: {
    position: 'absolute',
    bottom: '14%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.glass.bg,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  hintText: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
