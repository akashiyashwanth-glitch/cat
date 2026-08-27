import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography, fontWeight } from '../theme';

/**
 * Lightweight global toast.
 *
 * There is no toast/snackbar dependency in the project, so this exposes a tiny
 * provider-plus-static API: mount `<ToastProvider>` once at the app root and
 * call `Toast.show(message)` from anywhere (including right before a
 * navigation) to surface a transient confirmation.
 */

interface ToastState {
  id: number;
  message: string;
}

const SHOW_MS = 2200;

/** Registry of the active provider's `show`; kept so `Toast.show` works anywhere. */
let showFn: ((message: string) => void) | null = null;

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setToast(null);
      },
    );
  }, [opacity]);

  const show = useCallback(
    (message: string) => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      timer.current = setTimeout(() => dismiss(), SHOW_MS);
    },
    [dismiss, opacity],
  );

  useEffect(() => {
    showFn = show;
    return () => {
      showFn = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  return (
    <>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { opacity }]}
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      ) : null}
    </>
  );
}

/** Static API — matches the `Toast.show(...)` calls referenced throughout the app. */
export const Toast = {
  show: (message: string) => showFn?.(message),
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    backgroundColor: colors.text,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.surface,
    textAlign: 'center',
  },
});

export default Toast;
