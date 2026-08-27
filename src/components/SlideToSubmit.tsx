import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, fontWeight } from '../theme';

/** Drag-handle diameter. The max travel is `trackWidth - THUMB_SIZE`. */
const THUMB_SIZE = 48;

interface SlideToSubmitProps {
  /** Called once when the thumb reaches the end of the track. */
  onComplete: () => void;
  /** Disables the gesture (e.g. while a submission is in flight). */
  disabled?: boolean;
}

/**
 * Slide-to-submit control (react-native-gesture-handler + reanimated).
 *
 * The thumb must travel the full width of the track before `onComplete` fires.
 * Releasing before the end animates the thumb back to the start with no
 * submission. A full drag still returns the thumb to the start after firing —
 * the caller is responsible for an idempotence guard (its `submitting` flag).
 */
export function SlideToSubmit({ onComplete, disabled = false }: SlideToSubmitProps) {
  const translateX = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  const gesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      const max = Math.max(0, trackWidth.value - THUMB_SIZE);
      translateX.value = Math.max(0, Math.min(max, event.translationX));
    })
    .onEnd(() => {
      const max = Math.max(0, trackWidth.value - THUMB_SIZE);
      if (translateX.value >= max - 2) {
        runOnJS(onComplete)();
      }
      // Always snap back — touched the end or not.
      translateX.value = withTiming(0, { duration: 220 });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.track}
        onLayout={(event) => {
          trackWidth.value = event.nativeEvent.layout.width;
        }}
      >
        <Animated.View style={[styles.fill, fillStyle]} pointerEvents="none" />
        <Animated.View style={[styles.thumb, thumbStyle, disabled && styles.thumbDisabled]}>
          <Ionicons name="arrow-forward" size={22} color={colors.onPrimary} />
        </Animated.View>
        <Text style={styles.label} numberOfLines={1}>
          Slide to Submit
        </Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: THUMB_SIZE + 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  thumbDisabled: { opacity: 0.5 },
  label: {
    fontSize: typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default SlideToSubmit;
