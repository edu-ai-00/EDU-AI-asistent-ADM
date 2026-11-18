// Order of the school checkbox list in the team dialogs (BR-Z5N45R).
//
// The picker is a short scroll box over every school in the system, listed by
// name. A teacher's own schools — the ones an admin opens "Upravit člena
// týmu" to look at — sat wherever the alphabet put them, usually below the
// fold, so checking what somebody is filed under meant scrolling. They now
// come first, each group still in Czech name order.
//
// The grouping follows the schools checked when the dialog opened, not the
// live selection: resorting on every tick would slide the next checkbox out
// from under the cursor.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file.

export interface PickableSchool {
  id: number;
  name: string;
}

/** The schools filed on the account first, then the rest, both by name. */
export function assignedFirst<T extends PickableSchool>(
  schools: T[],
  assignedOnOpen: ReadonlySet<number>
): T[] {
  return [...schools].sort((a, b) => {
    const aAssigned = assignedOnOpen.has(a.id);
    if (aAssigned !== assignedOnOpen.has(b.id)) return aAssigned ? -1 : 1;
    return a.name.localeCompare(b.name, "cs");
  });
}

/**
 * Where the unassigned group starts in an `assignedFirst` list, so the list
 * can draw the line between the two and the end of the assigned ones is
 * visible without counting checkboxes. -1 when there is no line to draw —
 * nothing assigned, or nothing left over.
 */
export function unassignedGroupStart(
  ordered: PickableSchool[],
  assignedOnOpen: ReadonlySet<number>
): number {
  const start = ordered.findIndex((s) => !assignedOnOpen.has(s.id));
  return start > 0 ? start : -1;
}
