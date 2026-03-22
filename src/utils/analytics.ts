import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

let initialized = false;

export function initAnalytics(): void {
  const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
  const posthogHost = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      persistence: 'localStorage',
      autocapture: true,
      capture_pageview: true,
    });
    posthog.register({ tool: 'card-studio' });
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const appEnv = import.meta.env.VITE_APP_ENV || 'development';

  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: appEnv,
      release: `card-studio@${import.meta.env.VITE_APP_VERSION || 'dev'}`,
      tracesSampleRate: appEnv === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: appEnv === 'production' ? 0.1 : 0,
    });
  }

  initialized = true;
}

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  if (!initialized) return;

  try {
    posthog.capture(name, properties);
  } catch {
    /* PostHog not initialized */
  }

  try {
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: name,
      data: properties,
      level: 'info',
    });
  } catch {
    /* Sentry not initialized */
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(error, {
      extra: context,
      tags: {
        error_type: (context?.type as string) || 'unknown',
      },
    });
  } catch {
    /* Sentry not initialized */
  }

  // Also track in PostHog for error rate dashboards
  try {
    posthog.capture('error_occurred', {
      error_message: error instanceof Error ? error.message : String(error),
      error_type: context?.type || 'unknown',
      ...context,
    });
  } catch {
    /* PostHog not initialized */
  }
}
