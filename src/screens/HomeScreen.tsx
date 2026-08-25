import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components';
import { colors, spacing, radii, typography, fontWeight } from '../theme';
import type { RootStackParamList, TabParamList } from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

/** Landing screen inside the tab navigator. */
export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CLINICAL ASSESSMENT TRACKER</Text>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.body}>
          Start a new session, review the assessment flow, or scan a printed QR
          to compare results.
        </Text>

        <View style={styles.card}>
          <Button label="New Patient Assessment" onPress={() => navigation.navigate('PatientEntry')} />
          <View style={styles.separator} />
          <Button label="Scan QR Code" variant="secondary" onPress={() => navigation.navigate('Scanner')} />
        </View>

        <Text style={styles.hint}>
          Tab how-to: Home · History · Profile — everything is wired and ready.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    color: '#0F6E8C',
    letterSpacing: 1.2,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: typography.display,
    fontWeight: fontWeight.bold,
    color: '#16232E',
  },
  body: {
    marginTop: spacing.base,
    fontSize: typography.body,
    lineHeight: 22,
    color: '#5F7080',
  },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  separator: { height: spacing.base },
  hint: {
    marginTop: spacing.xl,
    fontSize: typography.bodySm,
    color: '#5F7080',
    textAlign: 'center',
  },
});