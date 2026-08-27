import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ToolDef } from '../types';
import { colors, radii, spacing, typography, fontWeight, touch } from '../theme';
import { Button } from './Button';

interface ToolSelectorProps {
  visible: boolean;
  tools: ToolDef[];
  /** tools already present in the active session (rendered as "added"). */
  selectedToolIds: string[];
  onClose: () => void;
  onSelect: (tool: ToolDef) => void;
}

/**
 * Modal listing every tool in the catalog (`useToolsStore`). Picking one
 * appends a new blank partition to the active session via `onSelect`.
 */
export function ToolSelector({
  visible,
  tools,
  selectedToolIds,
  onClose,
  onSelect,
}: ToolSelectorProps) {
  const renderItem = ({ item }: { item: ToolDef }) => {
    const isAdded = selectedToolIds.includes(item.id);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.name}`}
        disabled={isAdded}
        onPress={() => onSelect(item)}
        style={({ pressed }) => [
          styles.row,
          pressed && !isAdded && styles.rowPressed,
          isAdded && styles.rowAdded,
        ]}
      >
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>{item.shortName}</Text>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description ? (
            <Text style={styles.rowDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowBadge}>
          {isAdded ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.badgeAdded}>Added</Text>
            </>
          ) : (
            <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Assessment Tool</Text>
            <Text style={styles.subtitle}>
              Choose a tool to add to this assessment session.
            </Text>
          </View>

          <FlatList
            data={tools}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            style={styles.listWrap}
          />

          <View style={styles.footer}>
            <Button label="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 35, 46, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    maxHeight: 520,
    overflow: 'hidden',
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.title,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.bodySm,
    color: colors.textMuted,
  },
  listWrap: { flexGrow: 0 },
  list: { padding: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.controlHeight, // >= 48px touch target
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  rowBody: { flex: 1, paddingRight: spacing.md },
  rowTitle: {
    fontSize: typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.textOnSurface,
  },
  rowName: {
    marginTop: 2,
    fontSize: typography.bodySm,
    color: colors.textMuted,
  },
  rowDesc: {
    marginTop: 2,
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  rowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowAdded: { opacity: 0.6 },
  badgeAdded: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  rowPressed: { opacity: 0.7 },
  footer: {
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});