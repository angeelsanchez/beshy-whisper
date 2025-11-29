import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'auth', 'key', 'p256dh', 'credential'];

function scrubSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s))) {
      scrubbed[k] = '[REDACTED]';
    } else {
      scrubbed[k] = v;
    }
  }
  return scrubbed;
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION ?? undefined,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }

      if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
        const url = breadcrumb.data?.url;
        if (typeof url === 'string' && /[?&](token|secret|key|auth)=/i.test(url)) {
          breadcrumb.data = {
            ...breadcrumb.data,
            url: url.replace(/([?&])(token|secret|key|auth)=[^&]*/gi, '$1$2=[REDACTED]'),
          };
        }
      }

      return breadcrumb;
    },

    beforeSend(event) {
      if (event.request?.headers) {
        const headers = event.request.headers;
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        for (const header of sensitiveHeaders) {
          if (headers[header]) {
            headers[header] = '[REDACTED]';
          }
        }
      }

      if (event.extra) {
        event.extra = scrubSensitiveFields(event.extra as Record<string, unknown>);
      }

      return event;
    },

    ignoreErrors: [
      /ResizeObserver loop/,
      /Non-Error promise rejection captured/,
      /Failed to fetch/,
      /NetworkError/,
      /Load failed/,
      /Hydration failed/,
      /Text content does not match/,
    ],

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
