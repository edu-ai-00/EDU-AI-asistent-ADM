export interface ClassStudent {
  id: number;
  name: string;
  login_code: string;
  email?: string | null;
  courses_count?: number;
  completed_count?: number;
  last_active_at?: string | null;
  stats?: { level: number; xp_points: number; streak_days: number } | null;
}

export interface Teacher {
  id: number;
  name: string;
  email?: string;
}

export interface AssignedCourse {
  id: number;
  course_id: string;
  name: string;
  emoji: string | null;
  status?: string;
  assigned_at: string | null;
}

export interface Classroom {
  id: number;
  name: string;
  created_at: string;
  students_count: number;
  students?: ClassStudent[];
  teachers?: Teacher[];
  courses?: AssignedCourse[];
  /** The school this class is filed under, or null while it is unfiled. */
  school?: { id: number; name: string } | null;
  /**
   * Class code (BR-TT6TD7): four characters a student types in the app, or
   * opens as /join/XXXX, to join the class themselves. Null = off. Always
   * null on a school-mate's class in the list (is_own === false).
   */
  join_code?: string | null;
  /**
   * False only for a teacher looking at a colleague's class in the same school
   * (BR-8QAWKP) — it is listed so they know it exists, but every endpoint
   * behind it answers 403. Absent on the detail response, where reaching the
   * payload at all already proves ownership.
   */
  is_own?: boolean;
}

export interface CreateClassroomPayload {
  name: string;
  students: { name: string; login_code: string }[];
  teacher_ids?: number[];
  /** Admin-only; the API ignores it from a teacher. */
  school_id?: number | null;
}

export interface UpdateClassroomPayload {
  name?: string;
  /** Four characters A–Z/0–9, or null to switch self-service joining off. */
  join_code?: string | null;
  teacher_ids?: number[];
  /** Admin-only; the API ignores it from a teacher. */
  school_id?: number | null;
}

export interface AddStudentsPayload {
  students: { name: string; login_code: string }[];
}

export interface AssignCoursesPayload {
  course_ids: number[];
}

/**
 * A guardian-owned classroom provisioned automatically when a parent
 * confirms consent for their child (BR-8FDF37). Never created in admin and
 * never mixed into the ordinary school classroom list — see
 * useSelfServiceClassrooms().
 */
export interface SelfServiceClassroom {
  id: number;
  name: string;
  type: "self_service";
  guardian_email: string | null;
  students_count: number;
  created_at: string;
}
