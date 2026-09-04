import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, ReportAnalytics, Toast } from '../components';
import { colors, spacing, typography, fontWeight } from '../theme';
import { useSessionStore, useSettingsStore, useToolsStore } from '../store';
import { getSession, listSessions } from '../db';
import {
  generateReportPDF,
  formatDate,
  sessionReportDate,
  type GeneratedPDF,
} from '../services';
import { analyzeSession, type SessionAnalysis } from '../core';
import type { RootStackParamList, Session } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportPreview'>;
type ReportTab = 'analytics' | 'pdf';

/**
 * Report preview.
 *
 * Generates the A4 PDF on entry (from the just-submitted session, or a
 * `sessionId` passed via deep link), renders it with `react-native-pdf`, and
 * exposes a "Download PDF" share action (saves/shared on both iOS & Android)
 * plus the comparative-report entry point. The "Analytics" tab surfaces the
 * same baseline-vs-current chart, KPIs and risk badge natively via
 * `react-native-svg` — available immediately, without waiting on the PDF.
 */

/** Most recent completed session for the same patient before `session`. */
function findPreviousSession(session: Session): Session | null {
  if (!session.patientId) return null;
  const earlier = listSessions(session.patientId)
    .filter((s) => s.id !== session.id && s.completedAt && s.createdAt < session.createdAt)
    .sort((a, b) => b.createdAt - a.createdAt);
  return earlier[0] ?? null;
}
export function ReportPreviewScreen({ navigation, route }: Props) {
  const [document, setDocument] = useState<GeneratedPDF | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(0);
  const [tab, setTab] = useState<ReportTab>('pdf');
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [baselineLabel, setBaselineLabel] = useState<string | undefined>(undefined);

  const activeSession = useSessionStore((s) => s.activeSession);
  const practitionerName = useSettingsStore((s) => s.settings.practitionerName);
  const sessionId = route.params?.sessionId ?? activeSession?.id ?? null;

  const generate = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setDocument(null);
    setPages(0);
    try {
      const session = sessionId ? getSession(sessionId) : activeSession;
      if (!session) throw new Error('No session to report.');

      const toolsStore = useToolsStore.getState();
      if (!toolsStore.loaded) toolsStore.loadTools();

      // Prefer the persisted row (carries `completedAt`) when available.
      const latest = getSession(session.id) ?? session;
      const tools = useToolsStore.getState().tools;

      // Analytics are ready immediately — the chart does not wait on the PDF.
      const previous = findPreviousSession(latest) ?? null;
      setAnalysis(analyzeSession(latest, tools, previous));
      setBaselineLabel(
        previous ? `Previous visit · ${formatDate(sessionReportDate(previous))}` : undefined,
      );

      const generated = await generateReportPDF(latest, {
        practitionerName,
        baseline: previous,
      });
      setDocument(generated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to generate the PDF report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, practitionerName]);

  const download = async () => {
    if (!document) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Sharing is not available on this device');
      await Sharing.shareAsync(document.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save / share assessment report',
        UTI: 'com.adobe.pdf',
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to share the PDF';
      Toast.show(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const hasSession = Boolean(sessionId || activeSession);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Report unavailable</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Button label="Retry" onPress={() => void generate()} />
          <View style={styles.gap} />
          <Button
            label="Back to Home"
            variant="secondary"
            onPress={() => navigation.navigate('Tabs')}
          />
        </View>
      ) : null}

      {!error && !hasSession ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No report to show</Text>
          <Text style={styles.emptyBody}>
            Complete an assessment first, then come back here to preview the PDF
            report.
          </Text>
          <Button
            label="Start Assessment"
            onPress={() => navigation.navigate('PatientEntry')}
          />
        </View>
      ) : null}

      {!error && hasSession ? (
        <View style={styles.shell}>
          <View style={styles.tabsRow}>
            {(['analytics', 'pdf'] as const).map((name) => {
              const active = tab === name;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(name)}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {name === 'analytics' ? 'Analytics' : 'PDF'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'analytics' && analysis ? (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ReportAnalytics analysis={analysis} baselineLabel={baselineLabel} />
            </ScrollView>
          ) : tab === 'analytics' ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingLabel}>Preparing analytics…</Text>
            </View>
          ) : tab === 'pdf' && loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingLabel}>Generating PDF…</Text>
            </View>
          ) : tab === 'pdf' && document ? (
            <View style={styles.pdfShell}>
              <View style={styles.fileBar}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {document.name}
                </Text>
                <Text style={styles.fileMeta}>
                  {pages > 0 ? `${pages} page${pages === 1 ? '' : 's'} · ` : ''}
                  {(document.size / 1024).toFixed(1)} KB
                </Text>
              </View>

              <View style={styles.pdfWrap}>
                <Pdf
                  source={{ uri: document.uri, cache: false }}
                  style={styles.pdf}
                  trustAllCerts={false}
                  enablePaging
                  fitPolicy={0}
                  onLoadComplete={(numberOfPages) => setPages(numberOfPages)}
                  onError={(cause) =>
                    setError(
                      cause?.message ? `Unable to open the PDF: ${cause.message}` : 'Unable to open the PDF',
                    )
                  }
                  renderActivityIndicator={(progress) => (
                    <View style={styles.pdfLoading}>
                      <ActivityIndicator color={colors.primary} />
                      <Text style={styles.pdfLoadingLabel}>
                        {progress > 0 ? `${Math.round(progress * 100)}%` : 'Loading PDF…'}
                      </Text>
                    </View>
                  )}
                />
              </View>

              <View style={styles.footer}>
                <Button label="Download PDF" onPress={download} />
                <View style={styles.gap} />
                <Button
                  label="Compare with Previous"
                  variant="secondary"
                  onPress={() => navigation.navigate('Comparative')}
                />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  shell: { flex: 1, backgroundColor: colors.background },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabLabel: {
    fontSize: typography.bodySm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  tabLabelActive: { color: colors.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.base, paddingBottom: spacing.xxl },
  pdfShell: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.headline,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  loadingLabel: {
    marginTop: spacing.md,
    fontSize: typography.body,
    color: colors.textMuted,
  },
  fileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  fileName: {
    flex: 1,
    fontSize: typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  fileMeta: {
    fontSize: typography.caption,
    color: colors.textMuted,
  },
  pdfWrap: { flex: 1 },
  pdf: { flex: 1, backgroundColor: colors.background },
  pdfLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  pdfLoadingLabel: { fontSize: typography.bodySm, color: colors.textMuted },
  footer: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  gap: { height: spacing.sm },
});

export default ReportPreviewScreen;