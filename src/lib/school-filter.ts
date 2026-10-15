// School filter for the teacher and classroom lists (BR-R84FVD).
//
// Both lists already carry each row's schools, so the filter runs over what is
// loaded instead of asking the API — which also keeps it working for a
// teacher, who cannot read /admin/schools but does see school-mates' classes.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export interface SchoolRef {
  id: number;
  name: string;
}

/** Filter value: "" = every school, "none" = filed under no school, else a school id. */
export const ALL_SCHOOLS = "";
export const NO_SCHOOL = "none";

/** Every school the rows mention, once each, ordered by name. */
export function schoolOptions(rows: SchoolRef[][]): SchoolRef[] {
  const byId = new Map<number, SchoolRef>();
  for (const schools of rows) {
    for (const s of schools) byId.set(s.id, { id: s.id, name: s.name });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "cs"));
}

/** Does a row filed under `schools` pass the filter? */
export function matchesSchool(schools: SchoolRef[], filter: string): boolean {
  if (filter === ALL_SCHOOLS) return true;
  if (filter === NO_SCHOOL) return schools.length === 0;
  return schools.some((s) => String(s.id) === filter);
}

/**
 * Whether a team member belongs among the teachers — the Učitelé tab, a
 * school's teacher list. Every teacher does, and so does an admin filed under
 * a school (BR-A7KEZ6): an account has one role, so an admin who also teaches
 * stays an admin, and the school is what says they teach there.
 */
export function listedAsTeacher(member: { role: string; schools: SchoolRef[] }): boolean {
  return member.role === "teacher" || (member.role === "admin" && member.schools.length > 0);
}
