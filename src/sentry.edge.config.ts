// Edge runtime Sentry init (src/middleware.ts), loaded by
// src/instrumentation.ts. Same settings as sentry.server.config.ts.

import * as Sentry from "@sentry/nextjs";
import {
  DEFAULT_SENTRY_DSN,
  SERVER_DATA_COLLECTION,
  scrubEvent,
  scrubSpan,
  sentryEnvironment,
  tracePropagationTargets,
  tracesSampleRate,
} from "@/lib/sentry/options";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || DEFAULT_SENTRY_DSN,
  environment: sentryEnvironment({
    override: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  }),

  tracesSampleRate: tracesSampleRate(process.env.NODE_ENV),
  tracePropagationTargets: tracePropagationTargets(process.env.NEXT_PUBLIC_API_URL, {
    sameOrigin: false,
  }),

  dataCollection: SERVER_DATA_COLLECTION,
  beforeSend: scrubEvent,
  // v11 streams spans instead of sending transactions, so this is where
  // trace data goes out (beforeSendTransaction is never called).
  beforeSendSpan: scrubSpan,
});
