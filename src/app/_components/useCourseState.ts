import { useCallback } from "react";
import type { Course, Lecture, Step } from "@/types/course";
import type { CourseV2, LessonV2, BlockV2 } from "@/types/block-v2";
import { getCurrentTimestamp } from "@/lib/defaults";
import type { Selection, SelectionTypeV1, SelectionTypeV2 } from "./types";

interface Args {
  course: Course | null;
  setCourse: (c: Course | null) => void;
  courseV2: CourseV2 | null;
  setCourseV2: (c: CourseV2 | null) => void;
  selection: Selection | null;
  setSelection: (s: Selection | null) => void;
  setHasChanges: (b: boolean) => void;
}

export function useCourseState({
  course, setCourse, courseV2, setCourseV2, selection, setSelection, setHasChanges,
}: Args) {
  // V1
  const handleSelectV1 = useCallback(
    (type: SelectionTypeV1, id: string, data: unknown) => {
      setSelection({ version: "v1", type, id, data: data as Course | Lecture | Step });
    },
    [setSelection]
  );

  const handleCourseChange = useCallback((updated: Course) => {
    setCourse(updated);
    setHasChanges(true);
    setSelection({ version: "v1", type: "course", id: "course", data: updated });
  }, [setCourse, setHasChanges, setSelection]);

  const handleLectureChange = useCallback((updated: Lecture) => {
    if (!course) return;
    const newLectures = course.lectures.map((l) => l.uuid4 === updated.uuid4 ? updated : l);
    setCourse({ ...course, lectures: newLectures });
    setHasChanges(true);
    setSelection({ version: "v1", type: "lecture", id: updated.uuid4, data: updated });
  }, [course, setCourse, setHasChanges, setSelection]);

  const handleStepChange = useCallback((updated: Step) => {
    if (!course) return;
    const newLectures = course.lectures.map((lecture) => ({
      ...lecture,
      steps: lecture.steps.map((step) => step.uuid4 === updated.uuid4 ? updated : step),
    }));
    setCourse({ ...course, lectures: newLectures });
    setHasChanges(true);
    setSelection({ version: "v1", type: "step", id: updated.uuid4, data: updated });
  }, [course, setCourse, setHasChanges, setSelection]);

  // V2
  const handleSelectV2 = useCallback(
    (type: SelectionTypeV2, id: string, data: unknown, lessonId?: string) => {
      setSelection({
        version: "v2", type, id, lessonId,
        data: data as CourseV2 | LessonV2 | BlockV2,
      });
    },
    [setSelection]
  );

  const handleCourseV2Change = useCallback((updated: CourseV2) => {
    updated.updated = getCurrentTimestamp();
    setCourseV2(updated);
    setHasChanges(true);
    setSelection({ version: "v2", type: "course_v2", id: "course_v2", data: updated });
  }, [setCourseV2, setHasChanges, setSelection]);

  const handleLessonV2Change = useCallback((updated: LessonV2) => {
    if (!courseV2) return;
    const newLessons = courseV2.lessons.map((l) => l.lesson_id === updated.lesson_id ? updated : l);
    setCourseV2({ ...courseV2, lessons: newLessons, updated: getCurrentTimestamp() });
    setHasChanges(true);
    setSelection({ version: "v2", type: "lesson_v2", id: updated.lesson_id, data: updated });
  }, [courseV2, setCourseV2, setHasChanges, setSelection]);

  const handleBlockV2Change = useCallback((updated: BlockV2) => {
    if (!courseV2) return;
    updated.updated = getCurrentTimestamp();
    // Detect block_id rename: selection.id holds the old ID
    const oldId = selection?.version === "v2" && selection.type === "block_v2"
      ? selection.id : updated.block_id;
    const isRenamed = oldId !== updated.block_id;
    const newBlocks = (courseV2.blocks || []).map((b) => b.block_id === oldId ? updated : b);
    // If block_id changed, update all lesson bindings
    const newLessons = isRenamed
      ? courseV2.lessons.map((l) => ({
          ...l,
          blocks: l.blocks.map((binding) =>
            binding.block_id === oldId ? { ...binding, block_id: updated.block_id } : binding
          ),
        }))
      : courseV2.lessons;
    setCourseV2({ ...courseV2, blocks: newBlocks, lessons: newLessons, updated: getCurrentTimestamp() });
    setHasChanges(true);
    setSelection({ version: "v2", type: "block_v2", id: updated.block_id, data: updated });
  }, [courseV2, selection, setCourseV2, setHasChanges, setSelection]);

  const handleBlockV2Delete = useCallback((blockId: string) => {
    if (!courseV2) return;
    const newBlocks = (courseV2.blocks || []).filter((b) => b.block_id !== blockId);
    const newLessons = courseV2.lessons.map((l) => ({
      ...l,
      blocks: l.blocks.filter((b) => b.block_id !== blockId),
    }));
    setCourseV2({ ...courseV2, blocks: newBlocks, lessons: newLessons, updated: getCurrentTimestamp() });
    setHasChanges(true);
    setSelection(null);
  }, [courseV2, setCourseV2, setHasChanges, setSelection]);

  return {
    handleSelectV1, handleCourseChange, handleLectureChange, handleStepChange,
    handleSelectV2, handleCourseV2Change, handleLessonV2Change, handleBlockV2Change, handleBlockV2Delete,
  };
}
