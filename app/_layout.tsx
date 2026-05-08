import { Stack } from 'expo-router';
import { useEffect } from 'react';

import '@/i18n';
import { initSentry } from '@/lib/sentry';

export default function RootLayout() {
  useEffect(() => {
    initSentry();
  }, []);
  return <Stack screenOptions={{ headerShown: false }} />;
}
