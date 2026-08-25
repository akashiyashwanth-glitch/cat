import React from 'react';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { StubScreen } from '../components';
import type { TabParamList } from '../types';

type Props = BottomTabScreenProps<TabParamList, 'Profile'>;

/** Practitioner profile / settings (emails, name, notes). Implemented later. */
export function ProfileScreen(_props: Props) {
  return (
    <StubScreen
      icon="person-circle-outline"
      title="Profile"
      subtitle="Manage your practitioner details and default report recipients."
    />
  );
}