// Browser Sentry init. On Next 14 (webpack) withSentryConfig injects this file
// into the client entry; Next 15.3+ would load it by itself. Shared settings:
// lib/sentry/options.ts.

import * as Sentry from "@sentry/nextjs";
import {
  CLIENT_DATA_COLLECTION,
  DEFAULT_SENTRY_DSN,
  hasSecretPath,
  scrubEvent,
  scrubRecordingEvent,
  scrubSpan,
  sentryEnvironment,
  tracePropagationTargets,
  tracesSampleRate,
} from "@/lib/sentry/options";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || DEFAULT_SENTRY_DSN,
  environment: sentryEnvironment({
    override: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  }),
  // The release is the commit SHA, injected at build time (next.config.mjs).

  tracesSampleRate: tracesSampleRate(process.env.NODE_ENV),
  tracePropagationTargets: tracePropagationTargets(process.env.NEXT_PUBLIC_API_URL, {
    sameOrigin: true,
  }),

  // Replays only of sessions that hit an error, with all text, inputs and
  // media masked, and no network request/response details. Not on the phone
  // capture page: the recorder's own page-load events carry the URL, token
  // included, and cannot be rewritten.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: hasSecretPath(window.location.pathname)
    ? []
    : [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
          networkDetailAllowUrls: [],
          beforeAddRecordingEvent: scrubRecordingEvent,
        }),
      ],

  dataCollection: CLIENT_DATA_COLLECTION,
  beforeSend: scrubEvent,
  // v11 streams spans instead of sending transactions, so this is where
  // trace data goes out (beforeSendTransaction is never called).
  beforeSendSpan: scrubSpan,
});

// Replay events skip beforeSend; their page list goes through scope processors.
Sentry.addEventProcessor((event) => (event.type === "replay_event" ? scrubEvent(event) : event));

// Called by Next 15.3+ on App Router navigations; on Next 14 the SDK patches
// the router instead.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
