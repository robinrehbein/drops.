import * as Sentry from '@sentry/react-native';

import { logDebug } from './debug-log';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // no-op if unconfigured (dev/test)
  Sentry.init({
    dsn,
    debug: __DEV__,
    tracesSampleRate: 0.1,
  });
}

export const captureException = (e: unknown): void => {
  logDebug('error', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  Sentry.captureException(e);
};
