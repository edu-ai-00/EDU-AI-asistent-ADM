import type { Course } from "@/types/course";
import type { CourseV2, ExportTypeV2 } from "@/types/block-v2";
import { validateCourseForExport } from "@/lib/defaults";

export type ImportFormat = "v1_course" | "v2_package" | "v2_block" | "unknown";

const V2_EXPORT_TYPES: ExportTypeV2[] = ["course_v2", "exercise_v2", "quiz_v2"];

export function detectImportFormat(data: unknown): ImportFormat {
  if (typeof data !== "object" || data === null) return "unknown";
  const obj = data as Record<string, unknown>;
  if (obj.export_type === "course") return "v1_course";
  if (V2_EXPORT_TYPES.includes(obj.export_type as ExportTypeV2)) return "v2_package";
  // V2 Block (explicit or legacy with block_id)
  if (obj.export_type === "block_v2" || (obj.block_id && obj.gpf)) return "v2_block";
  return "unknown";
}

// Helper to prepare Quiz export (strip hints, help from question blocks)
function prepareQuizExport(courseData: CourseV2): CourseV2 {
  const questionBlocks = (courseData.blocks || [])
    .filter((block) => block.type === "question")
    .map((block) => {
      const { hint, help, ...rest } = block;
      return rest;
    });
  const questionBlockIds = new Set(questionBlocks.map((b) => b.block_id));
  const filteredLessons = courseData.lessons.map((lesson) => ({
    ...lesson,
    blocks: lesson.blocks.filter((b) => questionBlockIds.has(b.block_id)),
  }));
  return { ...courseData, blocks: questionBlocks, lessons: filteredLessons };
}

interface ExportArgs {
  course: Course | null;
  courseV2: CourseV2 | null;
  filename: string | null;
  importVersion: "v1" | "v2" | null;
}

export function exportCourse({ course, courseV2, filename, importVersion }: ExportArgs): void {
  let dataToExport: Course | CourseV2 | null = importVersion === "v2" ? courseV2 : course;
  if (!dataToExport) return;

  // V2: Validate blocks before export
  if (importVersion === "v2" && courseV2) {
    const validationErrors = validateCourseForExport(courseV2);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors
        .map((ve) => `Block ${ve.blockId}:\n  - ${ve.errors.join("\n  - ")}`)
        .join("\n\n");
      alert("Export zablokován - bloky obsahují chyby:\n\n" + errorMessages + "\n\nOpravte chyby a zkuste znovu.");
      return;
    }
    // Quiz export: filter to question blocks only and strip hints/solutions
    if (courseV2.export_type === "quiz_v2") {
      const questionBlocks = (courseV2.blocks || []).filter((b) => b.type === "question");
      if (questionBlocks.length === 0) {
        alert("Quiz export vyžaduje alespoň jeden Question blok.\n\nQuiz mód exportuje pouze bloky typu Question.");
        return;
      }
      dataToExport = prepareQuizExport(courseV2);
    }
  }

  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.json";
  a.click();
  URL.revokeObjectURL(url);
}
