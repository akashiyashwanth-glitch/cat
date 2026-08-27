import React, { useEffect, useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button, QuestionAnswerCard, ToolSelector } from '../components';
import { colors, spacing, radii, typography } from '../theme';
import { upsertPatient } from '../db';
import { useSessionStore, useToolsStore } from '../store';
import type {
  Answer,
  AnswerValue,
  RootStackParamList,
  ToolDef,
  ToolResult,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AssessmentForm'>;

/** True when an answer is non-blank (used by the step/progress counter). */
function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (value === '') return false;
  return !(Array.isArray(value) && value.length === 0);
}

/**
 * Schema-driven assessment engine: renders every tool partition in the active
 * session against its `ToolDef` and auto-saves each answer change.
 */
export function AssessmentFormScreen({ navigation }: Props) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const tools = useToolsStore((s) => s.tools);
  const loadTools = useToolsStore((s) => s.loadTools);
  const activeSession = useSessionStore((s) => s.activeSession);
  const addToolResult = useSessionStore((s) => s.addToolResult);
  const updateAnswers = useSessionStore((s) => s.updateAnswers);
  const flushAnswers = useSessionStore((s) => s.flushAnswers);

  // Hydrate the tool catalog and guarantee a session exists to append to.
  useEffect(() => {
    const toolSlice = useToolsStore.getState();
    if (!toolSlice.loaded) toolSlice.loadTools();

    const sessionSlice = useSessionStore.getState();
    if (!sessionSlice.activeSession) {
      const patient = sessionSlice.patient ?? upsertPatient('New Assessment');
      sessionSlice.startSession(patient);
    }
  }, []);

  // Assemble <ToolResult, ToolDef> pairs so rendering is driven by schema only.
  const parts = useMemo(() => {
    const results = activeSession?.toolResults ?? [];
    const out: Array<{ result: ToolResult; tool: ToolDef }> = [];
    for (const result of results) {
      const tool = tools.find((t) => t.id === result.toolId);
      if (tool) out.push({ result, tool });
    }
    return out;
  }, [activeSession, tools]);

  const answeredTotal = useMemo(() => {
    let count = 0;
    for (const { result, tool } of parts) {
      for (const question of tool.questions) {
        const answer = result.answers.find((a) => a.questionId === question.id);
        if (isAnswered(answer?.value)) count += 1;
      }
    }
    return count;
  }, [parts]);

  const totalQuestions = parts.reduce((sum, part) => sum + part.tool.questions.length, 0);
  const progress = totalQuestions > 0 ? Math.round((answeredTotal / totalQuestions) * 100) : 0;

  const changeAnswer = (toolId: string, questionId: string, value: AnswerValue) => {
    const session = useSessionStore.getState().activeSession;
    if (!session) return;
    const result = session.toolResults.find((t) => t.toolId === toolId);
    if (!result) return;

    const answers: Answer[] = [...result.answers];
    const index = answers.findIndex((a) => a.questionId === questionId);
    if (value === null) {
      // Clearing an answer removes it from the merged answer list.
      if (index >= 0) answers.splice(index, 1);
    } else if (index >= 0) {
      answers[index] = { questionId, value };
    } else {
      answers.push({ questionId, value });
    }
    updateAnswers(toolId, answers);
  };

  const addTool = (tool: ToolDef) => {
    addToolResult(tool.id, []); // appends a blank partition + writes a row
    setSelectorOpen(false);
  };

  const review = () => {
    flushAnswers(); // land the pending debounced write before navigating
    navigation.navigate('ReviewSubmit');
  };

  const selectedToolIds = parts.map((part) => part.result.toolId);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top bar — "Select Tool" trigger that opens the tool modal */}
          <View style={styles.toolbar}>
            <View style={styles.toolbarText}>
              <Text style={styles.eyebrow}>ASSESSMENT SESSION</Text>
              <Text style={styles.toolbarTitle}>Assessment Tools</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Select Tool"
              onPress={() => setSelectorOpen(true)}
              style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.selectButtonText}>Select Tool</Text>
            </Pressable>
          </View>

          {parts.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={40} color={colors.primary} />
              <Text style={styles.emptyTitle}>No tools added yet</Text>
              <Text style={styles.emptyBody}>
                Tap “Select Tool” to add a clinical assessment to this session.
              </Text>
              <Button label="Select Tool" onPress={() => setSelectorOpen(true)} />
            </View>
          ) : (
            <>
              {/* Step / progress indicator */}
              <View style={styles.stepsBar}>
                <Text style={styles.stepsText}>
                  Step {answeredTotal} of {totalQuestions} questions
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>

              {parts.map(({ result, tool }) => (
                <ToolSection
                  key={tool.id}
                  tool={tool}
                  result={result}
                  onAnswer={changeAnswer}
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* Footer actions */}
        {parts.length > 0 ? (
          <View style={styles.footer}>
            <Button
              label="Add Another Assessment Tool"
              variant="secondary"
              onPress={() => setSelectorOpen(true)}
            />
            <View style={styles.footerGap} />
            <Button label="Review & Submit" onPress={review} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <ToolSelector
        visible={selectorOpen}
        tools={tools}
        selectedToolIds={selectedToolIds}
        onClose={() => setSelectorOpen(false)}
        onSelect={addTool}
      />
    </SafeAreaView>
  );
}

interface ToolSectionProps {
  tool: ToolDef;
  result: ToolResult;
  onAnswer: (toolId: string, questionId: string, value: AnswerValue) => void;
}

/** Renders one appended tool partition as a card-style question group. */
function ToolSection({ tool, result, onAnswer }: ToolSectionProps) {
  return (
    <View style={styles.toolSection}>
      <View style={styles.toolHeader}>
        <View style={styles.toolHeaderText}>
          <Text style={styles.toolShort}>{tool.shortName}</Text>
          <Text style={styles.toolName}>{tool.name}</Text>
        </View>
        <View style={styles.scoreChip}>
          <Text style={styles.scoreText}>
            {result.score} / {tool.maxScore}
          </Text>
        </View>
      </View>

      {tool.questions.map((question, index) => (
        <QuestionAnswerCard
          key={question.id}
          question={question}
          index={index}
          total={tool.questions.length}
          value={result.answers.find((a) => a.questionId === question.id)?.value ?? null}
          onChange={(value) => onAnswer(tool.id, question.id, value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  toolbarText: { flex: 1, paddingRight: spacing.sm },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 1.2,
  },
  toolbarTitle: {
    marginTop: 2,
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.base,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  selectButtonText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  pressed: { opacity: 0.85 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  stepsBar: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  stepsText: {
    fontSize: typography.bodySm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  toolSection: { marginBottom: spacing.md },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  toolHeaderText: { flex: 1, paddingRight: spacing.sm },
  toolShort: {
    fontSize: typography.overline,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  toolName: {
    marginTop: 2,
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  scoreChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 56,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: typography.bodySm,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  footerGap: { height: 2 },
});
