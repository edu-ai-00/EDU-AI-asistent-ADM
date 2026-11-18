// node:test suite for which skill queries each role is allowed to fire
// (BR-JQMYFT). Run with `npm test`.
//
// `/admin/vectors*` sits in the API's admin-only group, while the per-course
// skill endpoints are shared with teachers — so every vector query has to stay
// idle for a teacher instead of collecting a 403. The hooks are exercised for
// real with `useQuery` stubbed out, so the assertion is on the options the hook
// actually hands React Query, not on the source text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// The role the stubbed useAuth() reports; the tests flip it between runs.
let role = "admin";

const STUBS = {
  "@tanstack/react-query": `
    export function useQuery(options) { return { options }; }
    export function useMutation(options) { return { options }; }
    export function useQueryClient() {
      return { invalidateQueries() {}, setQueryData() {} };
    }
  `,
  // The query functions return their endpoint, so each probe can name the URL
  // it is really guarding.
  "@/lib/api/client": `
    const echo = (path) => path;
    export const api = { get: echo, post: echo, put: echo, delete: echo };
  `,
  // The real hook reads a cookie through React's useMemo, which needs a
  // renderer; the role is all these queries ask of it.
  "@/hooks/useAuth": `
    export function useAuth() {
      return {
        user: null,
        isAdmin: globalThis.__adminTestRole === "admin",
        isTeacher: globalThis.__adminTestRole === "teacher",
        isAuthenticated: true,
      };
    }
  `,
};

const src = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier];
    if (stub) {
      return {
        url: `data:text/javascript,${encodeURIComponent(stub)}`,
        format: "module",
        shortCircuit: true,
      };
    }
    // useSkills.ts imports through the `@/` path alias, which only Next
    // resolves: map it onto src/ (with the .ts extension Node needs).
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const hooks = await import("./useSkills.ts");

// Every read the skills hooks offer, with the endpoint it hits.
const PROBES = [
  { name: "useVectors", endpoint: "/admin/vectors", call: () => hooks.useVectors() },
  { name: "useVector", endpoint: "/admin/vectors/v1", call: () => hooks.useVector("v1") },
  {
    name: "useVectorDimensions",
    endpoint: "/admin/vectors/v1/dimensions",
    call: () => hooks.useVectorDimensions("v1"),
  },
  {
    name: "useCourseSkillConfig",
    endpoint: "/admin/courses/7/skill-config",
    call: () => hooks.useCourseSkillConfig(7),
  },
  {
    name: "useCourseSkillsOverview",
    endpoint: "/admin/courses/7/skills/overview",
    call: () => hooks.useCourseSkillsOverview(7),
  },
  {
    name: "useCourseSkillStats",
    endpoint: "/admin/courses/7/skills/stats",
    call: () => hooks.useCourseSkillStats(7),
  },
];

// A query with no `enabled` of its own runs.
function probe(entry) {
  globalThis.__adminTestRole = role;
  const { options } = entry.call();
  return { endpoint: options.queryFn(), enabled: Boolean(options.enabled ?? true) };
}

const isVectorQuery = (endpoint) => endpoint.startsWith("/admin/vectors");

test("every probe still points at the endpoint it claims", () => {
  role = "admin";
  for (const entry of PROBES) {
    assert.equal(probe(entry).endpoint, entry.endpoint, `${entry.name} moved`);
  }
});

test("a teacher fires no admin-only vector query (BR-JQMYFT)", () => {
  role = "teacher";
  for (const entry of PROBES) {
    const { endpoint, enabled } = probe(entry);
    assert.equal(
      enabled,
      !isVectorQuery(endpoint),
      isVectorQuery(endpoint)
        ? `${entry.name} still calls admin-only ${endpoint} as a teacher`
        : `${entry.name} went idle for a teacher, but ${endpoint} is theirs to read`,
    );
  }
});

test("an admin still reads the whole catalogue", () => {
  role = "admin";
  for (const entry of PROBES) {
    assert.equal(probe(entry).enabled, true, `${entry.name} idle for an admin`);
  }
});

test("a vector query without an id stays idle whoever is signed in", () => {
  for (role of ["admin", "teacher"]) {
    globalThis.__adminTestRole = role;
    assert.equal(Boolean(hooks.useVector(undefined).options.enabled), false);
    assert.equal(
      Boolean(hooks.useVectorDimensions(undefined).options.enabled),
      false,
    );
  }
});
