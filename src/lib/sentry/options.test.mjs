// node:test suite for the shared Sentry settings in options.ts. Run with
// `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CLIENT_DATA_COLLECTION,
  SERVER_DATA_COLLECTION,
  hasSecretPath,
  scrubEvent,
  scrubPath,
  scrubRecordingEvent,
  scrubSpan,
  scrubUrl,
  sentryEnvironment,
  tracePropagationTargets,
  tracesSampleRate,
} from "./options.ts";

const PROD_API = "https://app-api.edu-ai.eu/api";
const STAGE_API = "https://app-api-stage.edu-ai.eu/api";

test("an explicit environment wins over everything", () => {
  assert.equal(
    sentryEnvironment({ override: "preview", nodeEnv: "development", apiUrl: STAGE_API }),
    "preview"
  );
});

test("a dev server is development whatever API it talks to", () => {
  assert.equal(sentryEnvironment({ nodeEnv: "development", apiUrl: PROD_API }), "development");
});

test("a build is named after the API it talks to", () => {
  assert.equal(sentryEnvironment({ nodeEnv: "production", apiUrl: STAGE_API }), "staging");
  assert.equal(sentryEnvironment({ nodeEnv: "production", apiUrl: PROD_API }), "production");
  assert.equal(
    sentryEnvironment({ nodeEnv: "production", apiUrl: "http://localhost:8000/api" }),
    "development"
  );
  assert.equal(
    sentryEnvironment({ nodeEnv: "production", apiUrl: "http://127.0.0.1:8000/api" }),
    "development"
  );
});

test("a blank override or a missing API URL falls back to production", () => {
  assert.equal(sentryEnvironment({ override: "  ", nodeEnv: "production" }), "production");
  assert.equal(sentryEnvironment({ nodeEnv: "production", apiUrl: "not a url" }), "production");
});

test("every trace is sampled in development, a tenth elsewhere", () => {
  assert.equal(tracesSampleRate("development"), 1.0);
  assert.equal(tracesSampleRate("production"), 0.1);
  assert.equal(tracesSampleRate(undefined), 0.1);
});

const propagates = (targets, url) => targets.some((target) => target.test(url));

test("the browser sends trace headers to the proxy, the API and localhost only", () => {
  const targets = tracePropagationTargets(PROD_API, { sameOrigin: true });

  // Same-origin requests are matched by their path.
  assert.ok(propagates(targets, "/api/backend/courses"));
  assert.ok(propagates(targets, "https://app-api.edu-ai.eu/api/admin/elo/export"));
  assert.ok(propagates(targets, "https://app-api-stage.edu-ai.eu/api/admin/elo/export"));
  assert.ok(propagates(targets, "http://localhost:8000/api/courses"));
  assert.ok(propagates(targets, "http://127.0.0.1:3795/api/backend"));

  assert.ok(!propagates(targets, "https://pub-1234.r2.dev/courses/1/cover.png"));
  assert.ok(!propagates(targets, "https://example.com/"));
  assert.ok(!propagates(targets, "https://app-api.edu-ai.eu.evil.example/api"));
  assert.ok(!propagates(targets, "https://evil.example/?next=https://app-api.edu-ai.eu/api"));
  assert.ok(!propagates(targets, "https://localhost.evil.example/"));
  // Protocol-relative: another origin, even though it starts with a slash.
  assert.ok(!propagates(targets, "//example.com/x"));
  assert.ok(propagates(targets, "/api/backend/x"));
});

test("the server sends trace headers to the API and localhost, never to external URLs", () => {
  const targets = tracePropagationTargets(STAGE_API, { sameOrigin: false });

  assert.ok(propagates(targets, "https://app-api-stage.edu-ai.eu/api/admin/auth/me"));
  assert.ok(propagates(targets, "https://app-api.edu-ai.eu/api/admin/auth/me"));
  assert.ok(propagates(targets, "http://localhost:8000/api/admin/auth/me"));
  // What /api/proxy-fetch fetches for the generator.
  assert.ok(!propagates(targets, "https://cs.wikipedia.org/wiki/Matematika"));
  assert.ok(!propagates(targets, "/api/backend/courses"));
});

test("a custom API URL is a propagation target too", () => {
  const targets = tracePropagationTargets("https://api.example.org/api", { sameOrigin: false });
  assert.ok(propagates(targets, "https://api.example.org/api/courses"));
  assert.ok(!propagates(targets, "https://api.example.org.evil.example/api"));
});

test("only the browser lets Sentry infer the user, and neither side sends cookies or bodies", () => {
  assert.equal(CLIENT_DATA_COLLECTION.userInfo, true);
  assert.equal(SERVER_DATA_COLLECTION.userInfo, false);
  for (const settings of [CLIENT_DATA_COLLECTION, SERVER_DATA_COLLECTION]) {
    assert.equal(settings.cookies, false);
    assert.deepEqual(settings.httpBodies, []);
    assert.ok(settings.httpHeaders.deny.includes("x-admin-key"));
  }
});

test("neither side sends sensitive query parameters or local variable values", () => {
  for (const settings of [CLIENT_DATA_COLLECTION, SERVER_DATA_COLLECTION]) {
    assert.deepEqual(settings.urlQueryParams, {
      deny: ["email", "code", "token", "signature", "credential"],
    });
    assert.equal(settings.stackFrameVariables, false);
  }
});

test("scrubEvent drops cookies, bodies and credential headers", () => {
  const event = scrubEvent({
    request: {
      url: "https://admin.example/admin/courses",
      cookies: { "edu-admin-token": "secret" },
      data: '{"code":"123456"}',
      headers: {
        Authorization: "Bearer secret",
        Cookie: "edu-admin-token=secret",
        "X-Admin-Key": "secret",
        "User-Agent": "Mozilla/5.0",
      },
    },
  });

  assert.deepEqual(event.request, {
    url: "https://admin.example/admin/courses",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
});

test("scrubEvent leaves an event without request data alone", () => {
  const event = { message: "boom" };
  assert.equal(scrubEvent(event), event);
  assert.deepEqual(event, { message: "boom" });
});

const TOKEN = "Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12Wx34";

test("the capture token is filtered from the page, the proxy and the upstream path", () => {
  assert.equal(scrubPath(`/capture/${TOKEN}`), "/capture/[Filtered]");
  assert.equal(
    scrubPath(`https://admin.example/api/capture/${TOKEN}/attachments?x=1`),
    "https://admin.example/api/capture/[Filtered]/attachments?x=1"
  );
  assert.equal(
    scrubPath(`https://app-api.edu-ai.eu/api/generation/capture/${TOKEN}`),
    "https://app-api.edu-ai.eu/api/generation/capture/[Filtered]"
  );
  assert.equal(scrubPath(`GET /api/capture/${TOKEN} [404]`), "GET /api/capture/[Filtered] [404]");
  // Same rule as the API's SentryPrivacy for the guardian consent link.
  assert.equal(scrubPath(`/consent/manage/${TOKEN}`), "/consent/manage/[Filtered]");
});

test("route patterns and unrelated paths stay readable", () => {
  for (const path of [
    "/capture/[token]",
    "/api/capture/[...path]",
    "/capture/%5Btoken%5D",
    "/generation/capture/{token}",
    "/consent/manage/request-link",
    "/admin/courses/12",
    "/api/backend/generation/sessions/7",
    "/screen-capture/abc",
  ]) {
    assert.equal(scrubPath(path), path);
  }
  assert.ok(hasSecretPath(`/capture/${TOKEN}`));
  assert.ok(!hasSecretPath("/admin"));
});

test("scrubUrl also filters the sensitive query parameter values", () => {
  assert.equal(
    scrubUrl(`https://admin.example/capture/${TOKEN}?email=a%40b.cz&tab=courses&code=123456#top`),
    "https://admin.example/capture/[Filtered]?email=[Filtered]&tab=courses&code=[Filtered]#top"
  );
  assert.equal(
    scrubUrl("/x?user_email=a&signature=s&credentials=c&access_token=t&page=2"),
    "/x?user_email=[Filtered]&signature=[Filtered]&credentials=[Filtered]&access_token=[Filtered]&page=2"
  );
  assert.equal(scrubUrl("/admin/users?search=novak&page=2"), "/admin/users?search=novak&page=2");
});

test("replay page lists lose sensitive query values too", () => {
  const event = scrubEvent({ urls: ["https://admin.example/sentry-e2e?email=page%40example.com&tab=1"] });
  assert.deepEqual(event.urls, ["https://admin.example/sentry-e2e?email=[Filtered]&tab=1"]);
});

test("scrubEvent filters the token wherever an event carries a URL", () => {
  const event = scrubEvent({
    request: { url: `https://admin.example/capture/${TOKEN}` },
    transaction: `/capture/${TOKEN}`,
    exception: { values: [{ value: `Upload to /api/capture/${TOKEN}/attachments failed` }] },
    breadcrumbs: [
      { category: "fetch", data: { method: "GET", url: `/api/capture/${TOKEN}`, status_code: 404 } },
      { category: "navigation", data: { from: "/admin", to: `/capture/${TOKEN}` } },
      { category: "console", message: `GET /api/capture/${TOKEN} 404` },
    ],
    contexts: { trace: { data: { url: `/api/capture/${TOKEN}` } } },
    urls: [`https://admin.example/capture/${TOKEN}`],
  });

  assert.ok(!JSON.stringify(event).includes(TOKEN));
  assert.equal(event.request.url, "https://admin.example/capture/[Filtered]");
  assert.equal(event.breadcrumbs[0].data.status_code, 404);
  assert.equal(event.breadcrumbs[1].data.from, "/admin");
  assert.deepEqual(event.urls, ["https://admin.example/capture/[Filtered]"]);
});

test("scrubSpan filters streamed span names and attributes", () => {
  const span = scrubSpan({
    name: `GET /api/capture/${TOKEN}`,
    attributes: { "url.full": `http://127.0.0.1/api/capture/${TOKEN}`, "http.response.status_code": 404 },
  });
  assert.deepEqual(span, {
    name: "GET /api/capture/[Filtered]",
    attributes: { "url.full": "http://127.0.0.1/api/capture/[Filtered]", "http.response.status_code": 404 },
  });
});

test("scrubRecordingEvent filters replay breadcrumbs and network spans", () => {
  const request = scrubRecordingEvent({
    type: 5,
    data: {
      tag: "performanceSpan",
      payload: { op: "resource.fetch", description: `/api/capture/${TOKEN}`, data: { method: "GET" } },
    },
  });
  const click = scrubRecordingEvent({
    type: 5,
    data: {
      tag: "breadcrumb",
      payload: { category: "ui.slowClickDetected", data: { url: `https://admin.example/capture/${TOKEN}` } },
    },
  });
  assert.equal(request.data.payload.description, "/api/capture/[Filtered]");
  assert.equal(click.data.payload.data.url, "https://admin.example/capture/[Filtered]");
});
