import type { Course, Lecture, Step } from "@/types/course";
import type { CourseV2, LessonV2, BlockV2 } from "@/types/block-v2";

export type SelectionTypeV1 = "course" | "lecture" | "step";
export type SelectionTypeV2 = "course_v2" | "lesson_v2" | "block_v2";

export interface SelectionV1 {
  version: "v1";
  type: SelectionTypeV1;
  id: string;
  data: Course | Lecture | Step;
}

export interface SelectionV2 {
  version: "v2";
  type: SelectionTypeV2;
  id: string;
  lessonId?: string;
  data: CourseV2 | LessonV2 | BlockV2;
}

export type Selection = SelectionV1 | SelectionV2;
