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
import { Snackbar } from '@/ui/primitives/Snackbar';
import { Text } from '@/ui/primitives/Text';
import { ThemeProvider } from '@/ui/theme/ThemeProvider';

export default function RootLayout() {
  const [migrated, setMigrated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
            {/* Earthy Forest is a light theme — force dark glyphs on the
                status bar so clock/battery stay legible against `paper`. */}
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
            </Stack>
            <Snackbar />
          </RepoProvider>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
