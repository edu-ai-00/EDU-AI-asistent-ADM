// node:test suite for what useAuth() hands the first render (BR-QPFPDW). Run
// with `npm test`.
//
// The signed-in user lives in a browser-only cookie, so the server renders
// every admin page signed out. The first render in the browser, the one React
// hydrates, has to come out the same, or every full load of a page that
// branches on the role ends in a hydration error. React hydrates with the
// snapshot the server rendered with, so a server render made while a
// `document` carrying the admin's cookie exists stands in for it here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

// useAuth.ts imports through the `@/` path alias, which only Next resolves:
// map it onto src/ (with the .ts extension Node needs).
const src = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { useAuth } = await import("./useAuth.ts");
const { getSessionUser } = await import("../lib/auth/session-user.ts");

const ADMIN = { id: 503, name: "Lenka", email: "lenka@example.com", role: "admin" };
const ADMIN_COOKIE = `edu-admin-user=${encodeURIComponent(JSON.stringify(ADMIN))}`;

/** A stand-in for the Navbar: who is signed in, and as what. */
function Probe() {
  const { user, isAdmin } = useAuth();
  return createElement("nav", null, user ? `${user.name} ${isAdmin ? "admin" : "teacher"}` : "signed out");
}

function inBrowserWith(cookie, render) {
  globalThis.document = { cookie };
  try {
    return render();
  } finally {
    delete globalThis.document;
  }
}

test("the cookie fixture is one the browser reads as the admin", () => {
  assert.deepEqual(
    inBrowserWith(ADMIN_COOKIE, () => getSessionUser()),
    ADMIN
  );
});

test("the server renders signed out", () => {
  assert.equal(renderToString(createElement(Probe)), "<nav>signed out</nav>");
});

test("the hydrating render matches the server even with the admin's cookie", () => {
  const html = inBrowserWith(ADMIN_COOKIE, () => renderToString(createElement(Probe)));

  assert.equal(html, "<nav>signed out</nav>");
});
