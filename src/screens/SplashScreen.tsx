import React, { useEffect } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

/** Boot screen. In later phases this performs DB init and preloads settings. */
export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Tabs', { screen: 'Home' });
    }, 1200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <StubScreen
      icon="medical-outline"
      title="Clinical Assessment Tracker"
      subtitle="Preparing your workspace…"
    />
  );
}