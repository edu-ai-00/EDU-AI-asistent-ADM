// node:test suite for the course factories in defaults.ts (BR-YZFYPN). Run
// with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// defaults.ts imports through the `@/` path alias, which only Next resolves:
// map it onto src/ (with the .ts extension Node needs) before loading it.
const src = new URL("../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL(`${specifier.slice(2)}.ts`, src).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { createStarterCourseV2 } = await import("./defaults.ts");

test("a new course starts with one lesson holding one display block", () => {
  const course = createStarterCourseV2({ name: "Nový kurz" });

  assert.equal(course.export_type, "course_v2");
  assert.equal(course.name, "Nový kurz");
  assert.equal(course.lessons.length, 1);
  assert.equal(course.blocks.length, 1);

  const [lesson] = course.lessons;
  const [block] = course.blocks;
  assert.equal(lesson.order, 1);
  assert.deepEqual(lesson.blocks, [{ block_id: block.block_id, order: 1 }]);
  assert.equal(block.type, "display");
  // The same blank text step "Přidat blok" gives, ready to be written into.
  assert.deepEqual(block.steps, [{ id: "s1", type: "text", order: 1, content: "" }]);
});

test("every new course gets its own lesson and block ids", () => {
  const a = createStarterCourseV2();
  const b = createStarterCourseV2();

  assert.notEqual(a.course_id, b.course_id);
  assert.notEqual(a.lessons[0].lesson_id, b.lessons[0].lesson_id);
  assert.notEqual(a.blocks[0].block_id, b.blocks[0].block_id);
});
