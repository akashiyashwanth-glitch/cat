import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen, Button } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AssessmentForm'>;

/** Multi-tool assessment form. Implemented in a later phase. */
export function AssessmentFormScreen({ navigation }: Props) {
  return (
    <StubScreen
      icon="reader-outline"
      title="Assessment Form"
      subtitle="Complete the selected clinical assessment tools."
    >
      <Button label="Review & Submit" onPress={() => navigation.navigate('ReviewSubmit')} />
    </StubScreen>
  );
}