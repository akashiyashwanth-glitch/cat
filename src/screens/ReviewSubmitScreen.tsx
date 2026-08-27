import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button, SlideToSubmit, Toast, ToolSelector } from '../components';
import { colors, radii, spacing, typography, fontWeight } from '../theme';
import { useSessionStore, useToolsStore } from '../store';
import { scoreToolResult } from '../core/scoring';
import type {
  AnswerValue,
  QuestionDef,
  RootStackParamList,
  ToolDef,
  ToolResult,
} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewSubmit'>;

/**
 * Final review + guarded slide-to-submit confirmation.
 *
 * Summarises every tool in the current session (name, answer pills, an
 * auto-computed score chip), lets the clinician add another tool (reusing the
 * ToolSelector modal), and exposes a slide-to-submit control. A full drag
 * persists the session as completed exactly once (guarded by `submitting`),
 * then navigates to ReportPreview.
 */
export function ReviewSubmitScreen({ navigation }: Props) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false); // synchronous idempotence guard

  const tools = useToolsStore((s) => s.tools);
  const loadTools = useToolsStore((s) => s.loadTools);
  const activeSession = useSessionStore((s) => s.activeSession);
  const addToolResult = useSessionStore((s) => s.addToolResult);
  const submitSession = useSessionStore((s) => s.submitSession);

  // Ensure the tool catalog is hydrated so summary cards can resolve names/options.
  useEffect(() => {
    const toolSlice = useToolsStore.getState();
    if (!toolSlice.loaded) toolSlice.loadTools();
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

  const selectedToolIds = parts.map((part) => part.result.toolId);

  const addTool = (tool: ToolDef) => {
    addToolResult(tool.id, []); // append a blank partition
    setSelectorOpen(false);
  };

  const submit = () => {
    // Guard against double-fire (slide control + rapid re-drags).
    if (submittedRef.current || submitting) return;
    if (!activeSession) return;

    submittedRef.current = true;
    setSubmitting(true);

    try {
      submitSession(); // persist the session as completed
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show('Assessment saved');
      navigation.replace('ReportPreview'); // ReportPreview generates the PDF on entry
    } catch (error) {
      submittedRef.current = false;
      setSubmitting(false);
      Toast.show(error instanceof Error ? error.message : 'Unable to submit');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>REVIEW & SUBMIT</Text>
          <Text style={styles.title}>Confirm Assessment</Text>
          <Text style={styles.subtitle}>
            Review each tool and its answers before generating the clinical report.
          </Text>
        </View>

        {parts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>Nothing to submit</Text>
            <Text style={styles.emptyBody}>
              Add an assessment tool to build this session before submitting.
            </Text>
            <Button label="Add Tool" onPress={() => setSelectorOpen(true)} />
          </View>
        ) : (
          <>
            {parts.map(({ result, tool }) => (
              <ToolSummaryCard key={tool.id} tool={tool} result={result} />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add Tool"
              onPress={() => setSelectorOpen(true)}
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addButtonText}>Add Tool</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Slide-to-submit pinned to the bottom, above safe-area padding. */}
      <View style={styles.footer}>
        <SlideToSubmit onComplete={submit} disabled={submitting || parts.length === 0} />
      </View>

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

interface ToolSummaryCardProps {
  tool: ToolDef;
  result: ToolResult;
}

/** One tool in the review list: name, per-question answer pills and a score chip. */
function ToolSummaryCard({ tool, result }: ToolSummaryCardProps) {
  // Auto-computed from the core scoring function (ToolDef options).
  const score = useMemo(() => scoreToolResult(tool, result.answers), [tool, result.answers]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardShort}>{tool.shortName}</Text>
          <Text style={styles.cardName}>{tool.name}</Text>
        </View>
        <View style={styles.scoreChip}>
          <Text style={styles.scoreText}>
            {score} / {tool.maxScore}
          </Text>
        </View>
      </View>

      {tool.questions.map((question) => {
        const answer = result.answers.find((a) => a.questionId === question.id);
        return (
          <View key={question.id} style={styles.answerRow}>
            <Text style={styles.answerPrompt} numberOfLines={2}>
              {question.prompt}
            </Text>
            <AnswerPills question={question} value={answer?.value ?? null} />
          </View>
        );
      })}
    </View>
  );
}

function AnswerPills({ question, value }: { question: QuestionDef; value: AnswerValue }) {
  const blank =
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);

  if (blank) {
    return <Text style={styles.unanswered}>Not answered</Text>;
  }

  if (Array.isArray(value)) {
    return (
      <View style={styles.pillWrap}>
        {value.map((selected) => {
          const label =
            question.options?.find((option) => option.value === selected)?.label ??
            String(selected);
          return (
            <View key={selected} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  // Single string or numeric value.
  let label: string;
  if (typeof value === 'string' && question.options?.length) {
    label = question.options.find((option) => option.value === value)?.label ?? value;
  } else {
    label = String(value);
  }
  return (
    <View style={styles.pillWrap}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  eyebrow: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    marginTop: 2,
    fontSize: typography.headline,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.bodySm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: fontWeight.bold,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardHeaderText: { flex: 1, paddingRight: spacing.sm },
  cardShort: {
    fontSize: typography.overline,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 1,
  },
  cardName: {
    marginTop: 2,
    fontSize: typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  scoreChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minWidth: 64,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  answerRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerPrompt: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.medium,
    color: colors.textOnSurface,
    marginBottom: spacing.xs,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  unanswered: {
    fontSize: typography.caption,
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  addButtonPressed: { opacity: 0.8 },
  addButtonText: {
    fontSize: typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});

export default ReviewSubmitScreen;
