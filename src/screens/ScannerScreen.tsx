import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { StubScreen } from '../components';
import type { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

/** QR code scanner (expo-camera). Implemented in a later phase. */
export function ScannerScreen(_props: Props) {
  return (
    <StubScreen
      icon="qr-code-outline"
      title="Scanner"
      subtitle="Scan a printed session QR code to seed a comparison."
    />
  );
}