import type { Classroom } from "@/types/classroom";

// Safe alphabet — excludes O/0/I/1 to avoid ambiguity when students type codes
const SAFE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ADJECTIVES = [
  "Stydlivý", "Odvážný", "Veselý", "Moudrý", "Rychlý",
  "Klidný", "Chytrý", "Legrační", "Zvědavý", "Šikovný",
  "Statečný", "Hravý", "Líný", "Tichý", "Zářivý",
  "Tajemný", "Bystrý", "Smělý", "Snivý", "Zlatý",
  "Kulatý", "Divoký", "Ztracený", "Létající", "Kosmický",
];

const ANIMALS = [
  "delfín", "tučňák", "medvěd", "kolibřík", "lev",
  "chameleon", "ježek", "panda", "tygr", "slon",
  "orel", "kocour", "zajíc", "vlk", "sob",
  "plameňák", "mrož", "vydra", "jelen", "koala",
  "papouček", "klokan", "surikata", "žirafa", "bobr",
];

function randomInt(max: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}

export function generateLoginCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");
}

export function generateStudentName(): string {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  return `${adj} ${animal}`;
}

export function generateStudents(count: number): { name: string; login_code: string }[] {
  const codes = new Set<string>();
  const students: { name: string; login_code: string }[] = [];

  for (let i = 0; i < count; i++) {
    let code: string;
    do {
      code = generateLoginCode();
    } while (codes.has(code));
    codes.add(code);
    students.push({ name: generateStudentName(), login_code: code });
  }

  return students;
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

export function classroomToText(classroom: Classroom): string {
  const students = classroom.students ?? [];
  const lines = [`${classroom.name}`, ""];
  const maxName = Math.max(...students.map((s) => s.name.length));
  students.forEach((s, i) => {
    const num = String(i + 1).padStart(2, " ");
    const name = s.name.padEnd(maxName, " ");
    lines.push(`${num}. ${name}  ${s.login_code}`);
  });
  return lines.join("\n");
}

export function classroomToCsv(classroom: Classroom): string {
  const students = classroom.students ?? [];
  const rows = ["Číslo,Jméno,Kód"];
  students.forEach((s, i) => {
    rows.push(`${i + 1},${s.name},${s.login_code}`);
  });
  return rows.join("\n");
}
