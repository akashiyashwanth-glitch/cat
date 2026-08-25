import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen, Button } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportPreview'>;

/** PDF preview, save, share and email actions. Implemented in a later phase. */
export function ReportPreviewScreen({ navigation }: Props) {
  return (
    <StubScreen
      icon="document-text-outline"
      title="Report Preview"
      subtitle="Preview the generated clinical assessment report (PDF)."
    >
      <Button label="Compare with Previous" onPress={() => navigation.navigate('Comparative')} />
    </StubScreen>
  );
}