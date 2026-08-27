import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components';
import { colors, spacing, radii, typography, fontWeight } from '../theme';
import { upsertPatient } from '../db';
import { useSessionStore } from '../store';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientEntry'>;

/** Patient intake: capture demographics, then create a session and proceed. */
export function PatientEntryScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [mrn, setMrn] = useState('');
  const [dob, setDob] = useState('');

  const canContinue = name.trim().length > 0;

  const continueToAssessment = () => {
    if (!canContinue) return;
    // Upsert the patient, then create + activate a fresh assessment session.
    const patient = upsertPatient({ name: name.trim(), mrn: mrn.trim() || undefined, dob: dob.trim() || undefined });
    useSessionStore.getState().startSession(patient);
    navigation.navigate('AssessmentForm');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>PATIENT INTAKE</Text>
          <Text style={styles.title}>Patient Entry</Text>
          <Text style={styles.body}>
            Enter the patient's details to start a new assessment session.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>Full name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Jane Doe"
              placeholderTextColor={colors.textMuted}
              maxLength={60}
              accessibilityLabel="Full name"
            />

            <Text style={styles.label}>MRN (optional)</Text>
            <TextInput
              style={styles.input}
              value={mrn}
              onChangeText={setMrn}
              placeholder="e.g. MRN-0042"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Medical record number"
            />

            <Text style={styles.label}>Date of birth (optional)</Text>
            <TextInput
              style={styles.input}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Date of birth"
            />
          </View>

          <Button label="Begin Assessment" onPress={continueToAssessment} disabled={!canContinue} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: typography.display,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  body: {
    marginTop: spacing.base,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textMuted,
  },
  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnSurface,
    marginBottom: spacing.sm,
    marginTop: spacing.base,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.textOnSurface,
    fontSize: typography.body,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
});