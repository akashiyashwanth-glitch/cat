import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Comparative'>;

/** Side-by-side comparison of two sessions. Implemented in a later phase. */
export function ComparativeScreen(_props: Props) {
  return (
    <StubScreen
      icon="bar-chart-outline"
      title="Comparative"
      subtitle="Compare current vs. previous assessment results."
    />
  );
}