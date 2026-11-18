import * as Sentry from "@sentry/nextjs";

// Server-side Sentry init. Next 14 calls register() only behind
// `experimental.instrumentationHook` (next.config.mjs).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Next 15+ reports server component, route handler and middleware errors
// here; on Next 14 the SDK's build-time wrappers capture them instead.
export const onRequestError = Sentry.captureRequestError;
