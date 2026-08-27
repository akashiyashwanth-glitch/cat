import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button } from '../components';
import { colors, spacing, radii, typography } from '../theme';
import { findIncompleteSession, findPatientByName, upsertPatient } from '../db';
import { useSessionStore } from '../store';
import type { Patient, RootStackParamList, Session } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientEntry'>;

/**
 * Patient intake.
 *
 * Collects the patient's name, then on "Next":
 * 1. resolves the patient idempotently by name (reuse an existing row),
 * 2. when none is in progress, creates a fresh, uuid-backed session linked to
 *    that patient and stores it in the zustand session store,
 * 3. otherwise offers to resume the most recent incomplete session instead.
 * A secondary "Load by QR scan" action jumps straight to the Scanner.
 */
export function PatientEntryScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [pendingPatient, setPendingPatient] = useState<Patient | null>(null);
  const [resumeCandidate, setResumeCandidate] = useState<Session | null>(null);
  // Guard so a fast double-tap can't create duplicate sessions.
  const busy = useRef(false);

  const trimmed = name.trim();
  const canContinue = trimmed.length > 0 && !busy.current;

  /** Reuse an existing patient by exact name, else create a fresh row. */
  const resolvePatient = (): Patient =>
    findPatientByName(trimmed) ?? upsertPatient({ name: trimmed });

  const startFresh = (patient: Patient) => {
    useSessionStore.getState().startSession(patient);
    setResumeCandidate(null);
    setPendingPatient(null);
    navigation.navigate('AssessmentForm');
  };

  const handleNext = () => {
    if (!canContinue) return;
    busy.current = true;

    // Idempotent: repeated submissions of the same name reuse the record.
    const patient = resolvePatient();
    useSessionStore.getState().setPatient(patient);

    // Resume support: offer an existing unfinished session, else start fresh.
    const incomplete = findIncompleteSession(patient.id);
    if (incomplete) {
      setPendingPatient(patient);
      setResumeCandidate(incomplete);
      return; // wait for the user's choice in the modal
    }

    startFresh(patient);
  };

  const handleResume = () => {
    if (!resumeCandidate) return;
    useSessionStore.getState().setActiveSession(resumeCandidate);
    navigation.navigate('AssessmentForm');
  };

  const dismissResume = () => {
    setResumeCandidate(null);
    setPendingPatient(null);
    busy.current = false;
  };

  const patientName = pendingPatient?.name ?? 'this patient';

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
            Enter the patient's name to start a new assessment session.
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
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleNext}
              accessibilityLabel="Full name"
            />
          </View>

          <Button label="Next" onPress={handleNext} disabled={!canContinue} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Resume an existing unfinished session? */}
      <Modal
        visible={resumeCandidate !== null}
        transparent
        animationType="fade"
        onRequestClose={dismissResume}
        statusBarTranslucent
      >
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissResume} />
          <View style={styles.sheet}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="play-circle-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.sheetTitle}>Resume existing session?</Text>
            <Text style={styles.sheetBody}>
              {patientName} has an assessment in progress. Resume where you left
              off, or clear it and start a fresh session.
            </Text>

            <Button
              label="Resume Session"
              onPress={handleResume}
              disabled={!resumeCandidate}
            />
            <View style={styles.sheetGap} />
            <Button
              label="Start New Session"
              variant="secondary"
              onPress={() => pendingPatient && startFresh(pendingPatient)}
            />
            <View style={styles.sheetGap} />
            <Button label="Cancel" variant="ghost" onPress={dismissResume} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, paddingTop: spacing.xxl },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: spacing.sm,
    fontSize: typography.display,
    fontWeight: '700',
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
    fontWeight: '600',
    color: colors.textOnSurface,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.textOnSurface,
    fontSize: typography.headline,
    fontWeight: '500',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  divider: { height: spacing.lg },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  secondaryPressed: { opacity: 0.6 },
  secondaryText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 35, 46, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  sheetIconWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.base,
  },
  sheetTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  sheetBody: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    fontSize: typography.body,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sheetGap: { height: spacing.sm },
});