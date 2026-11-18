// Deep links into the admin's own pages (BR-H7WZJ5).
//
// The users page keeps its state in the query string, so a link to a class
// detail has to name the tab, the class and — when it should land on one —
// the subtab. Written once here so the school dialog and the class list
// cannot drift apart.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export type ClassroomSubTab = "students" | "teachers" | "courses" | "skills";

export function classroomHref(id: number, subtab?: ClassroomSubTab): string {
  const base = `/admin/users?tab=classrooms&classroom=${id}`;
  return subtab ? `${base}&subtab=${subtab}` : base;
}
