import { pluralCs } from "@/lib/notifications";

/**
 * The question asked before a class is deleted (BR-3CN3QN). Deleting a class
 * cannot be undone — there is no bin — and the API erases with it every
 * pupil account minted for that class alone (login code, no email, in no
 * other class). Pupils with their own account, or also on another class's
 * roster, only leave the class (AdminClassroomController::destroy).
 */
export function classroomDeletePrompt(classroom: {
  name: string;
  studentCount: number;
}): string {
  const { name, studentCount } = classroom;
  const pupils = `${studentCount} ${pluralCs(studentCount, "žák", "žáci", "žáků")}`;

  if (studentCount === 0) {
    return `Opravdu chcete smazat třídu „${name}“? Třída nemá žádné žáky. Tuto akci nelze vrátit zpět.`;
  }

  return (
    `Opravdu chcete smazat třídu „${name}“ (${pupils})? ` +
    "Účty žáků založené pro tuto třídu budou i s celou historií nevratně odstraněny. " +
    "Žáci s vlastním účtem nebo zapsaní i v jiné třídě zůstanou, jen z této třídy vypadnou. " +
    "Tuto akci nelze vrátit zpět."
  );
}
