import React, { useRef } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { theme } from '../styles/theme';

interface SwipeBackViewProps {
  onBack: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

// How far in from the left edge a drag has to start, and how far it has to
// travel, before it counts as "go back" rather than a scroll or a tap.
const EDGE_WIDTH = 44;
const DISMISS_DISTANCE = 80;
const FLICK_VELOCITY = 0.4;

/**
 * The left-edge swipe people expect from iOS, without pulling in a navigation
 * library — the app drives screens from plain state.
 */
export const SwipeBackView: React.FC<SwipeBackViewProps> = ({ onBack, children, style }) => {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;

  const settleBack = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gesture) => {
        // pageX is where the finger is now, so subtract the travel to find
        // where the drag actually began.
        const startX = evt.nativeEvent.pageX - gesture.dx;
        return startX < EDGE_WIDTH && gesture.dx > 12 && Math.abs(gesture.dy) < 24;
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldDismiss = gesture.dx > DISMISS_DISTANCE || gesture.vx > FLICK_VELOCITY;
        if (!shouldDismiss) return settleBack();

        // Carry the screen all the way off before swapping, so the change
        // happens out of sight instead of snapping under the finger.
        Animated.timing(translateX, {
          toValue: width,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) return;
          // Deliberately leave the screen parked off-canvas: the parent
          // unmounts it, and resetting here made it flash back into place for
          // a frame before that happened.
          onBack();
        });
      },
      onPanResponderTerminate: settleBack,
    })
  ).current;

  return (
    <Animated.View
      style={[styles.fill, style, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: theme.colors.bg.base,
    // A soft edge sells the screen as a layer sliding over what is behind it.
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
});
