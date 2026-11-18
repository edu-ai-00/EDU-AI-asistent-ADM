import { withSentryConfig } from "@sentry/nextjs/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 runs src/instrumentation.ts (the server and edge Sentry init)
    // only behind this flag. Stable from Next 15, where this can go.
    instrumentationHook: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: "no-big-deals",
  project: "eduai-web",

  // Build-time secret (a Railway variable, never committed). Without it the
  // build skips the source map upload and still succeeds.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // The commit being built, so browser and server events and the uploaded
  // source maps all name the same release.
  release: {
    name: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA,
  },

  // Upload every client chunk for readable frames, then delete the client
  // maps so they are not served publicly.
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  silent: !process.env.CI,
});
