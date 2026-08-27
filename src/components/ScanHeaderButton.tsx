import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, touch } from '../theme';

interface ScanHeaderButtonProps {
  onPress: () => void;
}

/**
 * Persistent QR-scanner icon for the navigation header (`headerRight`).
 *
 * Shown on PatientEntry and AssessmentForm so the clinician can jump to the
 * Scanner screen from anywhere in the intake flow. Honours the app's >= 48px
 * touch-target rule and uses the primary accent token.
 */
export function ScanHeaderButton({ onPress }: ScanHeaderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Scan QR"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touch.target,
    minHeight: touch.target,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginRight: 4,
  },
  pressed: { opacity: 0.5 },
});