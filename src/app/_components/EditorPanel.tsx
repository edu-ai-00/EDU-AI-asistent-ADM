"use client";

import {
  CourseEditor,
  LectureEditor,
  StepEditor,
  CourseV2Editor,
  LessonV2Editor,
  BlockV2Editor,
} from "@/components/editors";
import type { Course, Lecture, Step } from "@/types/course";
import type { CourseV2, LessonV2, BlockV2 } from "@/types/block-v2";
import type { VectorDimensionLabel } from "@/components/editors/BlockV2Editor";
import type { Selection } from "./types";

interface EditorPanelProps {
  selection: Selection | null;
  courseV2: CourseV2 | null;
  vectorDimLabels: VectorDimensionLabel[] | undefined;
  onCourseChange: (updated: Course) => void;
  onLectureChange: (updated: Lecture) => void;
  onStepChange: (updated: Step) => void;
  onCourseV2Change: (updated: CourseV2) => void;
  onLessonV2Change: (updated: LessonV2) => void;
  onBlockV2Change: (updated: BlockV2) => void;
  onBlockV2Delete: (blockId: string) => void;
}

export function EditorPanel({
  selection,
  courseV2,
  vectorDimLabels,
  onCourseChange,
  onLectureChange,
  onStepChange,
  onCourseV2Change,
  onLessonV2Change,
  onBlockV2Change,
  onBlockV2Delete,
}: EditorPanelProps) {
  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 overflow-auto">
      {/* V1 Editors */}
      {selection?.version === "v1" && selection.type === "course" && (
        <CourseEditor
          course={selection.data as Course}
          onChange={onCourseChange}
        />
      )}
      {selection?.version === "v1" && selection.type === "lecture" && (
        <LectureEditor
          lecture={selection.data as Lecture}
          onChange={onLectureChange}
        />
      )}
      {selection?.version === "v1" && selection.type === "step" && (
        <StepEditor
          step={selection.data as Step}
          onChange={onStepChange}
        />
      )}

      {/* V2 Editors */}
      {selection?.version === "v2" && selection.type === "course_v2" && (
        <CourseV2Editor
          course={selection.data as CourseV2}
          onChange={onCourseV2Change}
        />
      )}
      {selection?.version === "v2" && selection.type === "lesson_v2" && (
        <LessonV2Editor
          lesson={selection.data as LessonV2}
          course={courseV2!}
          onChange={onLessonV2Change}
          onCourseChange={onCourseV2Change}
        />
      )}
      {selection?.version === "v2" && selection.type === "block_v2" && (
        <BlockV2Editor
          key={selection.id}
          block={selection.data as BlockV2}
          onChange={onBlockV2Change}
          onDelete={() => onBlockV2Delete((selection.data as BlockV2).block_id)}
          courseBlocks={courseV2?.blocks}
          vectorDimensions={vectorDimLabels}
        />
      )}

      {!selection && (
        <div className="text-center text-gray-500 py-20">
          Select an item from the tree to edit
        </div>
      )}
    </div>
  );
}
