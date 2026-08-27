import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AnswerValue, Option, QuestionDef } from '../types';
import { colors, radii, spacing, typography, fontWeight, touch } from '../theme';

/**
 * Card-style question renderer driven solely by a `QuestionDef` schema. All
 * touch targets are >= 48px and every color/radius comes from the theme tokens.
 */

interface QuestionAnswerCardProps {
  question: QuestionDef;
  /** Ordinal within the parent tool, for the "Q n of m" step chip. */
  index: number;
  total: number;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

/** Single question card: prompt + one control matched to its type. */
export function QuestionAnswerCard({
  question,
  index,
  total,
  value,
  onChange,
}: QuestionAnswerCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.stepChip}>
          <Text style={styles.stepChipText}>
            {index + 1}/{total}
          </Text>
        </View>
        {question.required ? (
          <Text style={styles.required}>Required</Text>
        ) : null}
      </View>

      <Text style={styles.prompt}>{question.prompt}</Text>
      <QuestionControl question={question} value={value} onChange={onChange} />
    </View>
  );
}

interface QuestionControlProps {
  question: QuestionDef;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}

/** Picks the matching control implementation for a question type. */
export function QuestionControl({ question, value, onChange }: QuestionControlProps) {
  switch (question.type) {
    case 'single-select':
      return (
        <OptionGroup
          options={question.options ?? []}
          value={typeof value === 'string' ? value : null}
          onChange={(v) => onChange(v)}
        />
      );
    case 'multiselect':
      return (
        <ChipGroup
          options={question.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
        />
      );
    case 'rating':
      // rating may be option-backed (like single-select) or a numeric circle
      // scale derived from its inclusive min/max range.
      if (question.options && question.options.length > 0) {
        return (
          <OptionGroup
            options={question.options}
            value={typeof value === 'string' ? value : null}
            onChange={(v) => onChange(v)}
          />
        );
      }
      return (
        <CircleScale
          min={question.min ?? 0}
          max={question.max ?? 5}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => onChange(v)}
        />
      );
    case 'numeric':
      return (
        <NumericStepper
          min={question.min ?? 0}
          max={question.max ?? 999}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => onChange(v)}
        />
      );
    case 'text':
    default:
      return (
        <TextInput
          style={styles.textInput}
          value={typeof value === 'string' ? value : value ? String(value) : ''}
          onChangeText={(v) => onChange(v)}
          placeholder="Type your answer…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={question.prompt}
          multiline
          textAlignVertical="top"
        />
      );
  }
interface OptionGroupProps {
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** single-select → segmented pills; tapping the selected pill clears it. */
function OptionGroup({ options, value, onChange }: OptionGroupProps) {
  return (
    <View style={styles.optionWrap}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(selected ? null : option.value)}
            style={({ pressed }) => [
              styles.option,
              selected ? styles.optionSelected : styles.optionIdle,
              pressed && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                selected ? styles.optionTextSelected : styles.optionTextIdle,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface ChipGroupProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
}

/** multiselect → toggle chips; tapping toggles array membership. */
function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(next);
  };
  return (
    <View style={styles.optionWrap}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => toggle(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected ? styles.chipSelected : styles.optionIdle,
              pressed && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                selected ? styles.optionTextSelected : styles.optionTextIdle,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
}
interface CircleScaleProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number | null) => void;
}

/** rating — n-circle row (one circle per integer, inclusive of min..max). */
function CircleScale({ min, max, value, onChange }: CircleScaleProps) {
  const size = max - min + 1;
  const circles: number[] = [];
  for (let i = min; i <= max; i += 1) circles.push(i);

  return (
    <View style={styles.circleWrap}>
      {circles.map((n) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityState={{ selected: value === n }}
          accessibilityLabel={`Rate ${n}`}
          onPress={() => onChange(value === n ? null : n)}
          style={({ pressed }) => [
            styles.circle,
            value === n ? styles.circleSelected : styles.circleIdle,
            pressed && styles.optionPressed,
          ]}
        >
          <Text
            style={[
              styles.circleText,
              value === n ? styles.circleTextSelected : styles.circleTextIdle,
            ]}
          >
            {n}
          </Text>
        </Pressable>
      ))}
      <Text style={styles.circleHint}>
        {size} point scale{min !== 0 ? ` (${min}–${max})` : ''}
      </Text>
    </View>
  );
}

interface NumericStepperProps {
  min: number;
  max: number;
  value: number | null;
  onChange: (value: number | null) => void;
}

/** numeric → − a stepper with +/- and a small inline TextInput. */
function NumericStepper({ min, max, value, onChange }: NumericStepperProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n)));
  return (
    <View style={styles.stepperWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        onPress={() => onChange(value === null ? min : clamp(value - 1))}
        style={({ pressed }) => [
          styles.stepButton,
          value !== null && value <= min && styles.stepButtonDisabled,
          pressed && styles.optionPressed,
        ]}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Pressable>

      <TextInput
        style={styles.stepperInput}
        value={value === null ? '' : String(value)}
        keyboardType="number-pad"
        accessibilityLabel="Numeric value"
        onChangeText={(text) => {
          const trimmed = text.trim();
          if (trimmed === '') return onChange(null);
          const parsed = Number(trimmed);
          if (!Number.isNaN(parsed)) onChange(clamp(parsed));
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase"
        onPress={() => onChange(value === null ? min : clamp(value + 1))}
        style={({ pressed }) => [
          styles.stepButton,
          value !== null && value >= max && styles.stepButtonDisabled,
          pressed && styles.optionPressed,
        ]}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  stepChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 40,
    alignItems: 'center',
  },
  stepChipText: {
    fontSize: typography.caption,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  required: {
    fontSize: typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  prompt: {
    fontSize: typography.body,
    fontWeight: fontWeight.medium,
    color: colors.textOnSurface,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  option: {
    minHeight: touch.controlHeight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionIdle: { backgroundColor: colors.surface, borderColor: colors.border },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionPressed: { opacity: 0.8 },
  optionText: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  optionTextIdle: { color: colors.textOnSurface },
  optionTextSelected: { color: colors.onPrimary },
  circleWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleIdle: { backgroundColor: colors.surface, borderColor: colors.border },
  circleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  circleText: { fontSize: typography.body, fontWeight: fontWeight.bold },
  circleTextIdle: { color: colors.textOnSurface },
  circleTextSelected: { color: colors.onPrimary },
  circleHint: {
    marginTop: spacing.xs,
    width: '100%',
    fontSize: typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepButton: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepButtonDisabled: { opacity: 0.4 },
  stepButtonText: {
    fontSize: typography.headline,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  stepperInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.textOnSurface,
    fontSize: typography.body,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  textInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.textOnSurface,
    fontSize: typography.body,
    padding: spacing.base,
    paddingTop: spacing.md,
  },
});
