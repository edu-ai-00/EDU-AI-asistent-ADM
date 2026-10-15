// School → class picking for "Upravit uživatele" (BR-QKCBCT).
//
// With twenty schools and a hundred classes one flat checkbox list stops
// working, so the dialog asks for the schools first and then offers only
// their classes, each list with a search box. A school change never drops a
// class on its own — which classes someone keeps is the admin's call — so a
// class already ticked in a school that is no longer picked stays listed
// until it is unticked.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export interface PickableSchool {
  id: number;
  name: string;
  identifier?: string | null;
}

export interface PickableClass {
  id: number;
  name: string;
  school: { id: number; name: string } | null;
}

export interface ClassGroup {
  key: string;
  title: string;
  classes: PickableClass[];
}

/** Classes filed under no school — reachable through no school, so always offered. */
export const UNFILED_GROUP = "unfiled";
/** Classes the person keeps in schools that are not picked (any more). */
export const ELSEWHERE_GROUP = "elsewhere";

/** Lower-case and accent-free, so "caslav" finds "ZŠ Čáslavská". */
function searchKey(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("cs").trim();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = searchKey(query);
  return q === "" || searchKey(text).includes(q);
}

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "cs", { numeric: true });

/** Step one's list: every school whose name or identifier matches, by name. */
export function pickableSchools<T extends PickableSchool>(schools: T[], query: string): T[] {
  return schools
    .filter((s) => matchesQuery(s.name, query) || (s.identifier != null && matchesQuery(s.identifier, query)))
    .sort(byName);
}

export function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

/**
 * The schools a pupil belongs to. Pupils are not filed under a school the
 * way the team is — they belong to one through their classes — so this is
 * what step one starts from for a student.
 */
export function schoolIdsOfClasses(classes: PickableClass[], classIds: number[]): number[] {
  const ids = new Set<number>();
  for (const c of classes) {
    if (c.school && classIds.includes(c.id)) ids.add(c.school.id);
  }
  return Array.from(ids);
}

/**
 * Step two's list: the picked schools' classes, one group per school in name
 * order; then the classes kept from schools that are not picked; then the
 * classes filed under no school. `query` narrows by class or school name,
 * and a group it empties is dropped — without a query a picked school with
 * no class still shows, so it does not look like the pick was lost.
 */
export function classGroups({
  classes,
  schools,
  schoolIds,
  assignedIds,
  query,
}: {
  classes: PickableClass[];
  schools: PickableSchool[];
  schoolIds: number[];
  assignedIds: number[];
  query: string;
}): ClassGroup[] {
  const matches = (c: PickableClass) =>
    matchesQuery(c.name, query) || (c.school != null && matchesQuery(c.school.name, query));
  const searching = searchKey(query) !== "";

  const groups: ClassGroup[] = schools
    .filter((s) => schoolIds.includes(s.id))
    .sort(byName)
    .map((s) => ({
      key: `school-${s.id}`,
      title: s.name,
      classes: classes.filter((c) => c.school?.id === s.id && matches(c)).sort(byName),
    }));

  groups.push({
    key: ELSEWHERE_GROUP,
    title: "Z jiných škol",
    classes: classes
      .filter((c) => c.school && !schoolIds.includes(c.school.id) && assignedIds.includes(c.id) && matches(c))
      .sort((a, b) => byName(a.school!, b.school!) || byName(a, b)),
  });

  groups.push({
    key: UNFILED_GROUP,
    title: "Bez školy",
    classes: classes.filter((c) => !c.school && matches(c)).sort(byName),
  });

  return groups.filter((g) =>
    g.classes.length > 0 || (!searching && g.key !== ELSEWHERE_GROUP && g.key !== UNFILED_GROUP)
  );
}
