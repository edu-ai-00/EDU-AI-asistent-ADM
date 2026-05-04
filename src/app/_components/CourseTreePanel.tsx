"use client";

import { CourseTree } from "@/components/CourseTree";
import { CourseTreeV2 } from "@/components/CourseTreeV2";
import type { Course } from "@/types/course";
import type { CourseV2 } from "@/types/block-v2";
import type { SelectionTypeV1, SelectionTypeV2 } from "./types";

interface CourseTreePanelProps {
  importVersion: "v1" | "v2" | null;
  course: Course | null;
  courseV2: CourseV2 | null;
  selectedId: string | null;
  onSelectV1: (type: SelectionTypeV1, id: string, data: unknown) => void;
  onSelectV2: (
    type: SelectionTypeV2,
    id: string,
    data: unknown,
    lessonId?: string
  ) => void;
  onCourseV2Change: (updated: CourseV2) => void;
}

export function CourseTreePanel({
  importVersion,
  course,
  courseV2,
  selectedId,
  onSelectV1,
  onSelectV2,
  onCourseV2Change,
}: CourseTreePanelProps) {
  return (
    <div className="w-80 flex-shrink-0 overflow-auto">
      {importVersion === "v1" && course && (
        <CourseTree
          course={course}
          selectedId={selectedId}
          onSelect={onSelectV1}
        />
      )}
      {importVersion === "v2" && courseV2 && (
        <CourseTreeV2
          course={courseV2}
          selectedId={selectedId}
          onSelect={onSelectV2}
          onCourseChange={onCourseV2Change}
        />
      )}
    </div>
  );
}
