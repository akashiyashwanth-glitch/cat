import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography, fontWeight, touch } from '../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Accessible full-primary button honoring the >= 48px touch-target rule. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : variant === 'secondary' ? styles.secondary : styles.ghost,
        (pressed || disabled) && (disabled ? styles.disabled : styles.pressed),
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          isPrimary ? styles.labelPrimary : variant === 'secondary' ? styles.labelSecondary : styles.labelGhost,
          disabled && styles.labelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.controlHeight, // >= 48px touch target
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primary: { backgroundColor: '#0F6E8C' },
  secondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DDE4EA' },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85 },
  disabled: { backgroundColor: '#B9C4CE', borderColor: '#B9C4CE' },
  label: { fontSize: typography.body, fontWeight: fontWeight.semibold },
  labelPrimary: { color: '#FFFFFF' },
  labelSecondary: { color: '#0F6E8C' },
  labelGhost: { color: '#0F6E8C' },
  labelDisabled: { color: '#FFFFFF' },
});