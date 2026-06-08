import 'react-native-get-random-values';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/i18n';
import { runMigrations } from '@/db/migrate';
import { QueryProvider } from '@/features/_provider/QueryProvider';
import { RepoProvider } from '@/features/_provider/RepoProvider';
import { ErrorBoundary } from '@/lib/error-boundary';
import { initSentry } from '@/lib/sentry';
import { useOnboardingStore } from '@/state/onboarding';
import { Snackbar } from '@/ui/primitives/Snackbar';
import { AppSplashScreen } from '@/ui/screens/AppSplashScreen';
import { OnboardingScreen } from '@/ui/screens/OnboardingScreen';
import { Text } from '@/ui/primitives/Text';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // E1: Onboarding gate — must be called before any early returns (Rules of Hooks)
  const onboardingCompleted = useOnboardingStore((s) => s.completed);

  useEffect(() => {
    initSentry();
    runMigrations()
      .then(async () => {
        // Seeding the places directory is best-effort: a failure here must never
        // block app boot (the app is fully usable without the bundled seed).
        try {
          const { getRepos } = await import('@/features/_provider/repos');
          const { seedPlacesIfNeeded } = await import('@/features/places/seed');
          await seedPlacesIfNeeded(getRepos().places);
        } catch (e) {
          console.warn('Places seed skipped:', e);
        }
      })
      .then(() => setMigrated(true))
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  if (error) {
    const isWebSQLiteSyncError =
      Platform.OS === 'web' && /SharedArrayBuffer|Sync operation timeout/i.test(error.message);

    return (
      <ThemeProvider>
        <View style={{ flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="title" align="center">
            {isWebSQLiteSyncError
              ? 'Drops cannot open its local database in this browser.'
              : 'Drops needs to rebuild its data.'}
          </Text>
          <Text variant="caption" align="center" style={{ marginTop: 12 }}>
            {isWebSQLiteSyncError
              ? 'Open Drops in Expo Go or a browser with SharedArrayBuffer support enabled.'
              : 'Restore from device backup or start fresh from Settings → Reset.'}
          </Text>
          {__DEV__ ? (
            <Text variant="caption" align="center" style={{ marginTop: 12 }}>
              {error.message}
            </Text>
          ) : null}
        </View>
      </ThemeProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          {migrated ? (
            <QueryProvider>
              <RepoProvider>
                <BottomSheetModalProvider>
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
                </BottomSheetModalProvider>
              </RepoProvider>
            </QueryProvider>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {splashVisible ? (
            <AppSplashScreen isReady={migrated} onHidden={() => setSplashVisible(false)} />
          ) : null}
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
