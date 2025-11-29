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

    beforeSend(event) {
      if (event.request?.headers) {
        const headers = event.request.headers;
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-forwarded-for'];
        for (const header of sensitiveHeaders) {
          if (headers[header]) {
            headers[header] = '[REDACTED]';
          }
        }
      }

      if (event.request?.data && typeof event.request.data === 'object') {
        event.request.data = scrubSensitiveFields(
          event.request.data as Record<string, unknown>
        );
      }

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });
}
