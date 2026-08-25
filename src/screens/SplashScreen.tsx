import React, { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen } from '../components';
import type { RootStackParamList } from '../types';
import { initDb, type DbStatus } from '../db';
import { useSettingsStore, useToolsStore } from '../store';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

/**
 * Boot screen. Opens SQLite, runs migrations, seeds the sample tools and
 * hydrates the tools/settings stores before navigating into the app.
 */
export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const dbStatus: DbStatus = await initDb();
        if (cancelled) return;
        // DB stays the source of truth — hydrate the in-memory store slices.
        useToolsStore.getState().loadTools();
        useSettingsStore.getState().loadSettings();
        if (__DEV__) {
          console.log(
            `[db] ready v${dbStatus.schemaVersion} (seeded=${dbStatus.seeded}) — ` +
              `${useToolsStore.getState().tools.length} tools loaded`,
          );
        }
      } catch (error) {
        // Surface the failure without blocking navigation; later phases add a
        // toast/retry UI for DB errors.
        console.warn('[db] init failed:', error);
      }
      if (!cancelled) navigation.replace('Tabs', { screen: 'Home' });
    }

    const timer = setTimeout(boot, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [navigation]);

  return (
    <StubScreen
      icon="medical-outline"
      title="Clinical Assessment Tracker"
      subtitle="Preparing your workspace…"
    />
  );
}