import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { StubScreen } from '../components';
import type { TabParamList } from '../types';

type Props = BottomTabScreenProps<TabParamList, 'History'>;

/** List of past assessment sessions. Implemented in a later phase. */
export function HistoryScreen(_props: Props) {
  return (
    <StubScreen
      icon="time-outline"
      title="History"
      subtitle="No sessions recorded yet. Completed assessments will appear here."
    />
  );
}