import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen, Button } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'PatientEntry'>;

/** Patient intake: name / MRN / DOB capture. Implemented in a later phase. */
export function PatientEntryScreen({ navigation }: Props) {
  return (
    <StubScreen
      icon="person-outline"
      title="Patient Entry"
      subtitle="Enter patient demographics to start a new assessment session."
    >
      <Button label="Begin Assessment" onPress={() => navigation.navigate('AssessmentForm')} />
    </StubScreen>
  );
}