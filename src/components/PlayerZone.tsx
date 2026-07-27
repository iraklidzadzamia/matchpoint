import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { PlayerSide } from '../engine/types';
import { theme } from '../styles/theme';

interface PlayerZoneProps {
  side: PlayerSide;
  score: string;
  onTap: (side: PlayerSide) => void;
  showTapHint?: boolean;
}

export const PlayerZone: React.FC<PlayerZoneProps> = ({
  side,
  score,
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
      
      <Text style={styles.scoreText}>
        {score}
      </Text>

      {showTapHint && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Tap here to score</Text>
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
    ...StyleSheet.absoluteFill,
    borderRadius: theme.radius.lg,
  },
  scoreText: {
    fontSize: 110,
    fontWeight: '900',
    color: theme.colors.text.primary,
    letterSpacing: -2,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  hintContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.glass.border,
  },
  hintText: {
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
