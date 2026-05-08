import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import '@/i18n';
import { runMigrations } from '@/db/migrate';
import { QueryProvider } from '@/features/_provider/QueryProvider';
import { RepoProvider } from '@/features/_provider/RepoProvider';
import { ErrorBoundary } from '@/lib/error-boundary';
import { initSentry } from '@/lib/sentry';
import { useOnboardingStore } from '@/state/onboarding';
import { Snackbar } from '@/ui/primitives/Snackbar';
import { OnboardingScreen } from '@/ui/screens/OnboardingScreen';
import { Text } from '@/ui/primitives/Text';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // E1: Onboarding gate — must be called before any early returns (Rules of Hooks)
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  useEffect(() => {
    initSentry();
    runMigrations()
      .then(() => setMigrated(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (error) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="title" align="center">Brewlog needs to rebuild its data.</Text>
          <Text variant="caption" align="center" style={{ marginTop: 12 }}>
            Restore from device backup or start fresh from Settings → Reset.
          </Text>
        </View>
      </ThemeProvider>
    );
  }
  if (!migrated) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption">Loading…</Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <RepoProvider>
            <StatusBar style="dark" />
            {onboardingCompleted ? (
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
              </Stack>
            ) : (
              <OnboardingScreen />
            )}
            <Snackbar />
          </RepoProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
