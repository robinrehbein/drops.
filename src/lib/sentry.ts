import * as Sentry from '@sentry/react-native';

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
  Sentry.captureException(e);
};
