/**
 * A team account filed under a school. Usually a teacher; `role` lets the
 * school dialog spot an admin filed here, whom "Odebrat" must only unfile,
 * never demote (BR-9Z59Z9).
 */
export interface SchoolTeacher {
  id: number;
  name: string;
  email: string;
  role: "admin" | "teacher";
}

/**
 * A school groups classrooms and the teachers who work there (BR-8QAWKP).
 *
 * Managed exclusively from the admin's Schools tab — `/admin/schools` is
 * admin-only on the API, so a teacher never fetches any of this.
 */
export interface School {
  id: number;
  name: string;
  address: string | null;
  identifier: string | null;
  classrooms_count: number;
  teachers: SchoolTeacher[];
  created_at: string;
}

export interface SchoolDetail extends School {
  classrooms: { id: number; name: string }[];
}

export interface SchoolPayload {
  name: string;
  address?: string | null;
  identifier?: string | null;
  teacher_ids?: number[];
}
