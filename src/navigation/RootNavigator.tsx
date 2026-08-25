import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SplashScreen } from '../screens/SplashScreen';
import { PatientEntryScreen } from '../screens/PatientEntryScreen';
import { AssessmentFormScreen } from '../screens/AssessmentFormScreen';
import { ReviewSubmitScreen } from '../screens/ReviewSubmitScreen';
import { ReportPreviewScreen } from '../screens/ReportPreviewScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ComparativeScreen } from '../screens/ComparativeScreen';
import { TabNavigator } from './TabNavigator';
import { colors, typography, fontWeight } from '../theme';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigation shell.
 *
 * Nesting notes:
 * - `Splash` is the first route shown; it `replace`s to `Tabs` after a short
 *   delay so the app demonstrates the full flow on launch.
 * - `Tabs` hosts the bottom tab bar (Home | History | Profile).
 * - The remaining screens are the feature flow: patient -> form -> review ->
 *   report -> comparative, plus the global QR `Scanner`.
 */
export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontSize: typography.title,
          fontWeight: '700',
          color: colors.text,
        },
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="PatientEntry"
        component={PatientEntryScreen}
        options={{ title: 'Patient Entry' }}
      />
      <Stack.Screen
        name="AssessmentForm"
        component={AssessmentFormScreen}
        options={{ title: 'Assessment' }}
      />
      <Stack.Screen
        name="ReviewSubmit"
        component={ReviewSubmitScreen}
        options={{ title: 'Review & Submit' }}
      />
      <Stack.Screen
        name="ReportPreview"
        component={ReportPreviewScreen}
        options={{ title: 'Report Preview' }}
      />
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Scan QR' }}
      />
      <Stack.Screen
        name="Comparative"
        component={ComparativeScreen}
        options={{ title: 'Comparative' }}
      />
    </Stack.Navigator>
  );
}