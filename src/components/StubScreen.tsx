import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing, typography, fontWeight } from '../theme';

interface StubScreenProps {
  /** Short screen heading. */
  title: string;
  /** Subtitle / description shown under the heading. */
  subtitle: string;
  /** Optional icon glyph from Ionicons. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Optional extra content rendered below the placeholder body. */
  children?: React.ReactNode;
}

/**
 * Placeholder screen used by every route in Phase 0 so the app launches and
 * the navigation shell is fully navigable before real screens are implemented.
 */
export function StubScreen({ title, subtitle, icon, children }: StubScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon ?? 'construct-outline'} size={40} color="#0F6E8C" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {children ? <View style={styles.children}>{children}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radii.lg,
    backgroundColor: '#D6EAF2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.headline,
    fontWeight: fontWeight.bold,
    color: '#16232E',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    fontWeight: fontWeight.regular,
    color: '#5F7080',
    textAlign: 'center',
    lineHeight: 22,
  },
  children: { marginTop: spacing.xl, alignSelf: 'stretch' },
});