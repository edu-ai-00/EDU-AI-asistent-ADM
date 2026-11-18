// Sentry settings shared by the three runtimes the admin runs in: the browser
// (src/instrumentation-client.ts), Node.js (src/sentry.server.config.ts) and
// Edge (src/sentry.edge.config.ts).
//
// The init files read the env and pass it in: Next inlines only literal
// `process.env.NEXT_PUBLIC_*` reads into the client bundle, so the values
// cannot be looked up from here.

import type { BrowserOptions } from "@sentry/nextjs";

type DataCollection = NonNullable<BrowserOptions["dataCollection"]>;

/**
 * Project `eduai-web` of the `no-big-deals` org (EU region). A DSN only lets
 * a client send events and ships in the bundle anyway; as the fallback it
 * keeps Sentry on when a deploy forgets NEXT_PUBLIC_SENTRY_DSN.
 */
export const DEFAULT_SENTRY_DSN =
  "https://de2a792605ecf57609fd74f57e40ee10@o4512392608415744.ingest.de.sentry.io/4512396578914384";

/** Same fallback as lib/server/auth.ts: a build without NEXT_PUBLIC_API_URL talks to prod. */
const DEFAULT_API_URL = "https://app-api.edu-ai.eu/api";

/** The Laravel API, prod and stage. */
const API_ORIGINS = ["https://app-api.edu-ai.eu", "https://app-api-stage.edu-ai.eu"];

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?([/?#]|$)/;

/**
 * Same-origin requests, which the browser SDK matches by their path. Not a
 * protocol-relative `//other.host/...`, which is another origin.
 */
const SAME_ORIGIN_PATH = /^\/(?!\/)/;

/** Headers that carry credentials. Never sent, whatever an integration attached. */
export const SENSITIVE_HEADERS = ["authorization", "cookie", "set-cookie", "x-admin-key"];

/**
 * Query parameters that carry personal data or a credential, the same list as
 * the API's. Matched as substrings of the parameter name, on top of the SDK's
 * own denylist (`auth`, `token`, `key`, …).
 */
export const SENSITIVE_QUERY_PARAMS = ["email", "code", "token", "signature", "credential"];

/** Proxy headers that carry the client's IP (the denylist Sentry gives for its v10 defaults). */
const IP_HEADERS = ["forwarded", "-ip", "remote-", "via", "-user"];

/**
 * Path segments that are themselves the credential: the QR capture token of
 * the phone page (/capture/<token>), its proxy (/api/capture/<token>) and the
 * upstream API path (/generation/capture/<token>), plus the guardian's consent
 * link, which the API scrubs the same way (App\Support\SentryPrivacy). Route
 * patterns (`[token]`, `{token}`) and the consent request-link route stay.
 */
const SECRET_PATH = /(\/consent\/manage|\/capture)\/(?!request-link\b|[[{]|%5B|%7B)[^/?#\s]+/gi;

function apiOrigin(apiUrl: string | undefined): URL | null {
  try {
    return new URL(apiUrl || DEFAULT_API_URL);
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The environment events are filed under. An explicit
 * NEXT_PUBLIC_SENTRY_ENVIRONMENT wins; otherwise a dev server is
 * `development` and a build is named after the API it talks to.
 */
export function sentryEnvironment(env: {
  override?: string;
  nodeEnv?: string;
  apiUrl?: string;
}): string {
  const override = env.override?.trim();
  if (override) return override;
  if (env.nodeEnv === "development") return "development";

  const host = apiOrigin(env.apiUrl)?.hostname;
  if (host?.includes("-stage")) return "staging";
  if (host === "localhost" || host === "127.0.0.1") return "development";
  return "production";
}

export function tracesSampleRate(nodeEnv: string | undefined): number {
  return nodeEnv === "development" ? 1.0 : 0.1;
}

/**
 * Where `sentry-trace`/`baggage` may go: the Laravel API and localhost, plus
 * same-origin paths in the browser (`/api/backend` forwards them to Laravel).
 * Nowhere else — R2 and other third parties would fail the CORS preflight on
 * the extra headers, and /api/proxy-fetch must not hand them to the external
 * URLs it fetches.
 */
export function tracePropagationTargets(
  apiUrl: string | undefined,
  { sameOrigin }: { sameOrigin: boolean }
): RegExp[] {
  const origins = new Set(API_ORIGINS);
  const configured = apiOrigin(apiUrl);
  if (configured) origins.add(configured.origin);

  const targets = Array.from(origins, (origin) => new RegExp(`^${escapeRegExp(origin)}([/?#]|$)`));
  targets.push(LOCALHOST);
  if (sameOrigin) targets.push(SAME_ORIGIN_PATH);
  return targets;
}

/**
 * Browser: the staff member's id, e-mail and IP (`userInfo` lets Sentry infer
 * the IP from the request that delivers the event), but no cookies, bodies,
 * credential headers or query parameters, and no local variable values.
 */
export const CLIENT_DATA_COLLECTION: DataCollection = {
  userInfo: true,
  cookies: false,
  httpHeaders: { deny: SENSITIVE_HEADERS },
  httpBodies: [],
  urlQueryParams: { deny: SENSITIVE_QUERY_PARAMS },
  stackFrameVariables: false,
};

/**
 * Node.js and Edge: nothing about the person behind the request — no IP, no
 * cookies, no bodies, no credential or IP-carrying headers, no sensitive
 * query parameters, no local variable values. The browser event already says
 * who it was.
 */
export const SERVER_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { deny: [...SENSITIVE_HEADERS, ...IP_HEADERS] },
  httpBodies: [],
  urlQueryParams: { deny: SENSITIVE_QUERY_PARAMS },
  stackFrameVariables: false,
};

/** Replaces credential path segments (SECRET_PATH) with `[Filtered]`. */
export function scrubPath(value: string): string {
  return value.replace(SECRET_PATH, "$1/[Filtered]");
}

export function hasSecretPath(value: string): boolean {
  return scrubPath(value) !== value;
}

const QUERY_PARAM = /([?&])([^=&#\s]+)=([^&#\s]*)/g;

/**
 * scrubPath plus the SENSITIVE_QUERY_PARAMS values. The SDK filters query
 * parameters itself in events, breadcrumbs and spans, but not in the replay
 * event's page list or in recording frames.
 */
export function scrubUrl(value: string): string {
  return scrubPath(value).replace(QUERY_PARAM, (param, separator: string, name: string) =>
    SENSITIVE_QUERY_PARAMS.some((term) => name.toLowerCase().includes(term))
      ? `${separator}${name}=[Filtered]`
      : param
  );
}

type StringRecord = Record<string, unknown>;

/** scrubUrl over the string values of a flat record (breadcrumb/span data). */
function scrubValues(record: StringRecord | undefined): void {
  if (!record) return;
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "string") record[key] = scrubUrl(value);
  }
}

interface ScrubbableEvent {
  request?: {
    url?: string;
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, string>;
  };
  transaction?: string;
  exception?: { values?: { value?: string }[] };
  breadcrumbs?: { message?: string; data?: StringRecord }[];
  contexts?: { trace?: { data?: StringRecord } };
  /** Replay events: the pages the recording covers. */
  urls?: string[];
}

/**
 * `beforeSend` for every runtime, and the browser's replay event processor:
 * the backstop behind the dataCollection settings. An event never leaves
 * with cookies, a request body, a credential header or a credential in a
 * URL (scrubUrl).
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  const request = event.request;
  if (request) {
    delete request.cookies;
    delete request.data;
    if (request.headers) {
      request.headers = Object.fromEntries(
        Object.entries(request.headers).filter(
          ([name]) => !SENSITIVE_HEADERS.includes(name.toLowerCase())
        )
      );
    }
    if (request.url) request.url = scrubUrl(request.url);
  }

  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubUrl(exception.value);
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubUrl(breadcrumb.message);
    scrubValues(breadcrumb.data);
  }
  scrubValues(event.contexts?.trace?.data);
  if (event.urls) event.urls = event.urls.map(scrubUrl);
  return event;
}

/** `beforeSendSpan`: span names and attributes (url.full, url.path, …) of streamed spans. */
export function scrubSpan<T extends { name: string; attributes?: StringRecord }>(span: T): T {
  span.name = scrubUrl(span.name);
  scrubValues(span.attributes);
  return span;
}

/**
 * Replay `beforeAddRecordingEvent`: the breadcrumbs and network/navigation
 * spans the Replay integration adds to a recording. The recorder's own DOM
 * events cannot be rewritten (see instrumentation-client.ts).
 */
export function scrubRecordingEvent<T extends { data: { payload: unknown } }>(event: T): T {
  const payload = event.data.payload as {
    description?: unknown;
    message?: unknown;
    data?: StringRecord;
  } | null;
  if (payload && typeof payload === "object") {
    if (typeof payload.description === "string") payload.description = scrubUrl(payload.description);
    if (typeof payload.message === "string") payload.message = scrubUrl(payload.message);
    scrubValues(payload.data);
  }
  return event;
}
