// GPF vector checks for the app's ELO engine (BR-S9SVNM).
//
// The Pilot 2 ELO engine in the app (eduai-app/lib/core/elo/elo_engine.dart)
// throws on a block whose relation_vector holds anything but exactly 0, 1 or 2,
// or whose elo_vector leaves the 0–10 range. The app swallows that error so a
// broken block never breaks answering — which means the block just stops
// moving ELO and nobody notices. Saving from the admin is the last place a bad
// vector can still be caught, so both save paths run these checks first.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight from this .ts source.

import type { BlockV2, CourseV2 } from "../types/block-v2";

/** Slots the app's ELO engine expects in every GPF vector. */
export const GPF_VECTOR_LENGTH = 35;

/** Range the engine accepts for a task ELO rating. */
export const ELO_RATING_MIN = 0;
export const ELO_RATING_MAX = 10;

const RELATION_VALUES = [0, 1, 2];

/** Offending slots listed in one message before the rest is summarised. */
const MAX_LISTED_SLOTS = 5;

export type GpfVectorField = "relation_vector" | "elo_vector";

export interface GpfVectorIssue {
  blockId: string;
  /** First lesson that binds the block — helps an author find it in the tree. */
  lessonName?: string;
  field: GpfVectorField;
  message: string;
}

/**
 * Problems with one block's ELO vectors. A block without vectors (or with an
 * empty one) is a display-only block the app skips on purpose, not an error.
 */
export function validateBlockGpfVectors(
  block: Pick<BlockV2, "block_id" | "gpf">,
  lessonName?: string,
): GpfVectorIssue[] {
  // Typed as GPFData, but it comes from stored or uploaded JSON: trust nothing.
  const gpf = block.gpf as unknown as Record<string, unknown> | undefined | null;
  if (!gpf || typeof gpf !== "object") return [];

  const issues: GpfVectorIssue[] = [];
  const push = (field: GpfVectorField, message: string) =>
    issues.push({ blockId: block.block_id, lessonName, field, message });

  const relation = gpf.relation_vector;
  if (relation != null) {
    checkVector(relation, "relation_vector", isRelationValue, "povolené jsou jen 0, 1 nebo 2", push);
  }

  const elo = gpf.elo_vector;
  if (elo != null) {
    checkVector(
      elo,
      "elo_vector",
      // null is how the engine marks an unrated slot, so it is allowed (a
      // hole in the array is saved as null too).
      (v) => v == null || isEloRating(v),
      `povolený je rozsah ${ELO_RATING_MIN}–${ELO_RATING_MAX}`,
      push,
    );
  }

  return issues;
}

/** Every GPF vector problem in a course, in block order. */
export function validateCourseGpfVectors(
  course: Pick<CourseV2, "blocks" | "lessons">,
): GpfVectorIssue[] {
  const lessonByBlock = new Map<string, string>();
  for (const lesson of course.lessons ?? []) {
    for (const binding of lesson.blocks ?? []) {
      if (!lessonByBlock.has(binding.block_id)) {
        lessonByBlock.set(binding.block_id, lesson.name);
      }
    }
  }

  return (course.blocks ?? []).flatMap((block) =>
    validateBlockGpfVectors(block, lessonByBlock.get(block.block_id)),
  );
}

/** A plain decimal number, as `double.tryParse` / PHP's is_numeric read it. */
const NUMERIC_STRING = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/**
 * The number a vector slot holds as the engine sees it, or undefined when the
 * slot is not a number at all. The app parses every slot with
 * `double.tryParse(e.toString())` (GpfMetadata.fromJson) before the engine
 * runs, and the API casts with `(float)`, so a numeric string such as "2" is
 * just the number 2. Course JSON put together outside the editor stores the
 * vectors that way (BR-6DRK92), so they must not be flagged as broken.
 */
export function gpfSlotNumber(value: unknown): number | undefined {
  const n =
    typeof value === "number" ? value
    : typeof value === "string" && NUMERIC_STRING.test(value.trim()) ? Number(value.trim())
    : undefined;
  return n !== undefined && Number.isFinite(n) ? n : undefined;
}

/**
 * A vector's dimension labels keyed by the slot they describe. Slot k is the
 * dimension whose dimension_index is k — the skills formula and the student's
 * ELO profile index by it — not the k-th label in the list. A vector with a
 * gap (the A34 course's has no dimension 9) made labels read by position slide
 * one row up from the gap on and left the last slot blank (BR-6DRK92).
 */
export function dimensionsBySlot<T extends { index: number }>(
  dimensions: readonly T[] | undefined,
): Map<number, T> {
  const bySlot = new Map<number, T>();
  for (const dim of dimensions ?? []) {
    if (!bySlot.has(dim.index)) bySlot.set(dim.index, dim);
  }
  return bySlot;
}

/** A relation slot the engine accepts. */
export function isRelationValue(value: unknown): boolean {
  const n = gpfSlotNumber(value);
  return n !== undefined && RELATION_VALUES.includes(n);
}

/** A task ELO rating the engine accepts (null excluded). */
export function isEloRating(value: unknown): boolean {
  const n = gpfSlotNumber(value);
  return n !== undefined && n >= ELO_RATING_MIN && n <= ELO_RATING_MAX;
}

function checkVector(
  vector: unknown,
  field: GpfVectorField,
  isValid: (value: unknown) => boolean,
  allowed: string,
  push: (field: GpfVectorField, message: string) => void,
) {
  if (!Array.isArray(vector)) {
    push(field, `${field} není pole čísel.`);
    return;
  }
  // The app treats an empty vector like a missing one (display-only block).
  if (vector.length === 0) return;

  if (vector.length !== GPF_VECTOR_LENGTH) {
    push(
      field,
      `${field} má ${vector.length} prvků, ELO engine potřebuje přesně ${GPF_VECTOR_LENGTH}.`,
    );
  }

  // A plain loop, not forEach: forEach skips holes, and a hole is exactly what
  // a sparse editor array turns into (null) once it is serialised.
  const bad: string[] = [];
  for (let index = 0; index < vector.length; index++) {
    const value: unknown = vector[index];
    if (!isValid(value)) bad.push(`[${index}] = ${JSON.stringify(value) ?? "prázdné"}`);
  }
  if (bad.length > 0) {
    const listed = bad.slice(0, MAX_LISTED_SLOTS).join(", ");
    const rest = bad.length > MAX_LISTED_SLOTS ? ` a dalších ${bad.length - MAX_LISTED_SLOTS}` : "";
    push(field, `${field}: neplatné hodnoty ${listed}${rest} — ${allowed}.`);
  }
}
