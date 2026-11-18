// node:test suite for the "Spojit uživatele" dialog crashing the users page
// (BR-ZKN2T9). Run with `npm test`.
//
// The users page keeps <MergeUsersDialog> mounted and only flips `open`, so
// React compares the hooks of the closed render with those of the open one.
// A hook below `if (!open) return null` made the open render call one more,
// and React threw #310 ("Rendered more hooks than during the previous
// render"). Nothing can render React here: the component is compiled with the
// TypeScript compiler and called as a plain function against a React stub
// that records every hook call, which is the list React itself compares.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const PATH = new URL("./MergeUsersDialog.tsx", import.meta.url).pathname;
const { outputText } = ts.transpileModule(readFileSync(PATH, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

let calls = [];
const modules = {
  react: {
    useState(initial) {
      calls.push("useState");
      return [typeof initial === "function" ? initial() : initial, () => {}];
    },
    useEffect() {
      calls.push("useEffect");
    },
    useMemo(factory) {
      calls.push("useMemo");
      return factory();
    },
  },
  // Elements are never mounted, so the child components are never called.
  "react/jsx-runtime": { jsx: () => ({}), jsxs: () => ({}), Fragment: "Fragment" },
  "@/hooks/useUserMerge": {
    useMergePreview() {
      calls.push("useMergePreview");
      return { data: undefined, error: null, isLoading: false, isFetching: false };
    },
    useMergeUsers() {
      calls.push("useMergeUsers");
      return { isPending: false, mutateAsync: async () => {} };
    },
  },
  "@/lib/api/client": { ApiError: class ApiError extends Error {} },
};
// lucide-react icons and the ui components only end up as element types.
const elementTypes = new Proxy({}, { get: () => () => null });

const exports = {};
new Function("require", "exports", outputText)(
  (specifier) => modules[specifier] ?? elementTypes,
  exports
);
const { MergeUsersDialog } = exports;

function render(open) {
  calls = [];
  const element = MergeUsersDialog({ open, onClose() {} });
  return { element, hooks: calls };
}

test("the closed dialog renders nothing", () => {
  assert.equal(render(false).element, null);
});

test("opening the dialog calls the same hooks as the closed render", () => {
  const closed = render(false);
  const opened = render(true);

  assert.notEqual(opened.element, null);
  assert.deepEqual(opened.hooks, closed.hooks);
});
