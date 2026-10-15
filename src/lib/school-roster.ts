// Who and what belongs to a school, as the school dialog lists it (BR-9Z59Z9).
//
// The dialog used to be a checkbox list of every teacher account in the
// system; it now lists only the school's own teachers and classes, and offers
// the rest as candidates to add. These helpers decide both lists and what
// "Odebrat" means for a given row, so the rules have tests of their own.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export interface SchoolRef {
  id: number;
  name: string;
}

export interface RosterTeacher {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
}

export interface RosterMember extends RosterTeacher {
  schools: SchoolRef[];
}

export interface RosterClassroom {
  id: number;
  name: string;
  school?: SchoolRef | null;
}

// numeric: "9.A" before "10.A", as the user dialog's class picker sorts them.
const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "cs", { numeric: true });

/**
 * Teachers on the team not yet filed under the school, by Czech name order.
 * Admins are left out on purpose: an admin already sees every class, so the
 * only thing filing one buys is a place on the Učitelé tab (BR-A7KEZ6) — and
 * that is done from the teacher side, by inviting the admin's e-mail as a
 * teacher or with the school picker in that tab's edit dialog.
 */
export function teacherCandidates(
  members: RosterMember[],
  schoolTeacherIds: number[]
): RosterMember[] {
  return members
    .filter((m) => m.role === "teacher" && !schoolTeacherIds.includes(m.id))
    .sort(byName);
}

/**
 * Who the Nová třída dialog offers to teach the class (BR-35BPD3): once a
 * school is picked, only the team members filed under it — the same people
 * the school dialog's own "Založit třídu" lists — and the whole team while
 * the class stays without a school.
 */
export function classTeacherOptions<T extends { schools: SchoolRef[] }>(
  members: T[],
  schoolId: number | null
): T[] {
  if (schoolId === null) return members;
  return members.filter((m) => m.schools.some((s) => s.id === schoolId));
}

/** The classes filed under the school, by Czech name order. */
export function classroomsOf<T extends RosterClassroom>(classrooms: T[], schoolId: number): T[] {
  return classrooms.filter((c) => c.school?.id === schoolId).sort(byName);
}

/**
 * Classes that could be added: unfiled ones first, then those filed under
 * another school — adding one of those moves it, so they come last and the
 * dialog says where they are now.
 */
export function classroomCandidates<T extends RosterClassroom>(
  classrooms: T[],
  schoolId: number
): T[] {
  const unfiled = classrooms.filter((c) => !c.school).sort(byName);
  const elsewhere = classrooms
    .filter((c) => c.school && c.school.id !== schoolId)
    .sort(byName);
  return [...unfiled, ...elsewhere];
}

export function withId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids : [...ids, id];
}

export function withoutId(ids: number[], id: number): number[] {
  return ids.filter((x) => x !== id);
}

/**
 * What "Odebrat" on a teacher does, and the confirm prompt that says so.
 *
 * A teacher goes back to being an ordinary user (žák) — the client's answer
 * on the report — which also takes them off every other school they were
 * filed under, so the prompt names those. An admin filed under the school is
 * only taken off it: demoting an admin from a school dialog would lock a
 * colleague out of the panel.
 */
export function teacherRemoval(
  teacher: RosterTeacher,
  otherSchools: SchoolRef[]
): { kind: "demote" | "unfile"; prompt: string } {
  // Worded around the account, not the person: Czech past forms and
  // pronouns are gendered, and a name says nothing reliable about which.
  if (teacher.role === "admin") {
    return {
      kind: "unfile",
      prompt:
        `Odebrat administrátorský účet ${teacher.name} z této školy? ` +
        "Přístup do administrace zůstane, účet jen přestane být veden u této školy.",
    };
  }

  const others = otherSchools.map((s) => s.name).sort((a, b) => a.localeCompare(b, "cs"));
  const elsewhere =
    others.length === 0
      ? ""
      : others.length === 1
        ? ` Účet zmizí i ze školy ${others[0]}.`
        : ` Účet zmizí i ze škol ${others.join(", ")}.`;

  return {
    kind: "demote",
    prompt:
      `Odebrat učitele ${teacher.name}? ` +
      "Účet se změní na běžného uživatele (žáka) a ztratí přístup do administrace." +
      elsewhere +
      " Účet ani data se nesmažou.",
  };
}
