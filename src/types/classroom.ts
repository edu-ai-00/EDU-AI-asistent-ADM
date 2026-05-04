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
}

export interface CreateClassroomPayload {
  name: string;
  students: { name: string; login_code: string }[];
  teacher_ids?: number[];
}

export interface UpdateClassroomPayload {
  name?: string;
  teacher_ids?: number[];
}

export interface AddStudentsPayload {
  students: { name: string; login_code: string }[];
}

export interface AssignCoursesPayload {
  course_ids: number[];
}
