// Search over the classroom list — class name, school, teachers (BR-8BBW5W).
//
// The list already carries every row's school and teachers, so the search runs
// over what is loaded instead of asking the API. Two things decide whether an
// admin finds the class they are after:
//
//  - the key is accent-free, because Czech names are full of diacritics and
//    nobody types "Dočkalová" into a search box to find a class;
//  - the query is matched word by word, each word against any of the fields,
//    so "Fuksová Hana" finds the same class as "Hana Fuksová" and "8.b fuksova"
//    narrows to that one class.
//
// Kept free of runtime imports so `npm test` can run its node:test suite
// straight off this file; searchKey() is deliberately the same key the class
// picker builds in user-school-classes.ts.

export interface SearchableClassroom {
  name: string;
  school?: { name: string } | null;
  teachers?: { name: string }[];
}

/** Lower-case and accent-free, so "caslav" finds "ZŠ Čáslavská". */
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("cs").trim();
}

/** The typed query as separate words; empty when nothing was typed. */
export function searchWords(query: string): string[] {
  return searchKey(query).split(/\s+/).filter(Boolean);
}

/** Everything a class can be found by. */
export function classroomSearchFields(classroom: SearchableClassroom): string[] {
  return [
    classroom.name,
    classroom.school?.name ?? "",
    ...(classroom.teachers ?? []).map((t) => t.name),
  ];
}

/** Does the class match every word of the query? */
export function matchesClassroom(classroom: SearchableClassroom, query: string): boolean {
  const words = searchWords(query);
  if (words.length === 0) return true;

  const fields = classroomSearchFields(classroom).map(searchKey).filter(Boolean);

  return words.every((word) => fields.some((field) => field.includes(word)));
}
