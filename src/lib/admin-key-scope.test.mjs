// node:test suite keeping the API admin key out of the browser bundle.
// Run with `npm test`.
//
// The API lets a request that carries X-Admin-Key and no bearer token act as a
// full admin (AdminMiddleware). Next.js inlines every NEXT_PUBLIC_ variable into
// the JavaScript it serves, so the key in a NEXT_PUBLIC_ variable — or read from
// a "use client" file at all — hands admin access to anyone who opens the panel.
// The ELO and answers exports did exactly that until they went through the
// /api/backend proxy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = new URL("..", import.meta.url).pathname;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({
  where: path.slice(SRC.length),
  text: readFileSync(path, "utf8"),
}));

test("no source reads the admin key from a NEXT_PUBLIC_ variable", () => {
  assert.deepEqual(
    files.filter((f) => f.text.includes("NEXT_PUBLIC_ADMIN_API_KEY")).map((f) => f.where),
    [],
  );
});

test("no client component touches the admin key", () => {
  const leaking = files
    .filter((f) => /^\s*["']use client["']/.test(f.text))
    .filter((f) => /x-admin-key|ADMIN_API_KEY/i.test(f.text))
    .map((f) => f.where);
  assert.deepEqual(leaking, []);
});

test("the course exports go through the proxy", () => {
  for (const name of ["ExportEloDialog.tsx", "ExportAnswersDialog.tsx"]) {
    const file = files.find((f) => f.where === `components/admin/${name}`);
    assert.ok(file, name);
    assert.match(file.text, /api\.getRaw\(/, name);
    assert.doesNotMatch(file.text, /\bfetch\(/, name);
  }
});
