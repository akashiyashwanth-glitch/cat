import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen, Button } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReviewSubmit'>;

/** Final review + slide-to-submit confirmation. Implemented in a later phase. */
export function ReviewSubmitScreen({ navigation }: Props) {
  return (
    <StubScreen
      icon="checkbox-outline"
      title="Review & Submit"
      subtitle="Confirm answers before generating the clinical report."
    >
      <Button label="Generate Report" onPress={() => navigation.navigate('ReportPreview')} />
    </StubScreen>
  );
}