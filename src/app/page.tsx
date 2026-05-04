"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Toolbar } from "@/components/Toolbar";
import type { Course } from "@/types/course";
import type { CourseV2, BlockV2 } from "@/types/block-v2";
import {
  createCourseV2,
  getCurrentTimestamp,
  migrateCourseBlocks,
  migrateBlockToSteps,
} from "@/lib/defaults";
import { Navbar } from "@/components/admin/Navbar";
import { useUploadCourse } from "@/hooks/useCourses";
import { useVectorDimensions } from "@/hooks/useSkills";
import type { VectorDimensionLabel } from "@/components/editors/BlockV2Editor";
import type { Course as ApiCourse } from "@/types/api";
import { EmptyState } from "./_components/EmptyState";
import { CourseTreePanel } from "./_components/CourseTreePanel";
import { EditorPanel } from "./_components/EditorPanel";
import { SaveDialog } from "./_components/SaveDialog";
import type { Selection } from "./_components/types";
import { useCourseState } from "./_components/useCourseState";
import { detectImportFormat, exportCourse } from "./_components/courseExport";

// Main Component (wrapped in Suspense for useSearchParams)
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();

  // V1 / V2 / shared state
  const [course, setCourse] = useState<Course | null>(null);
  const [courseV2, setCourseV2] = useState<CourseV2 | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [importVersion, setImportVersion] = useState<"v1" | "v2" | null>(null);

  // Admin edit mode state
  const [isAdminEdit, setIsAdminEdit] = useState(false);
  const [editCourseMeta, setEditCourseMeta] = useState<ApiCourse | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const uploadCourse = useUploadCourse();

  // Fetch GPF dimension labels for the course's assigned vector
  const { data: rawDimensions } = useVectorDimensions(editCourseMeta?.vector_id ?? undefined);
  const vectorDimLabels: VectorDimensionLabel[] | undefined = rawDimensions?.map((d) => ({
    index: d.dimension_index,
    code: d.code,
    name: d.name,
    domain_code: d.domain_code,
  }));

  // Check for course to edit from sessionStorage (from dashboard)
  useEffect(() => {
    const isEdit = searchParams.get("edit") === "true";
    if (!isEdit) return;
    const storedCourse = sessionStorage.getItem("editCourse");
    const storedMeta = sessionStorage.getItem("editCourseMeta");
    if (!storedCourse) return;
    try {
      const courseData = migrateCourseBlocks(JSON.parse(storedCourse) as CourseV2);
      sessionStorage.removeItem("editCourse"); // Clean up
      if (storedMeta) {
        setEditCourseMeta(JSON.parse(storedMeta) as ApiCourse);
        sessionStorage.removeItem("editCourseMeta");
      }
      setCourseV2(courseData);
      setCourse(null);
      setFilename(`${courseData.course_id}-v${courseData.version}.json`);
      setHasChanges(false);
      setImportVersion("v2");
      setIsAdminEdit(true);
      setSelection({
        version: "v2",
        type: "course_v2",
        id: "course_v2",
        data: courseData,
      });
    } catch (e) {
      console.error("Failed to parse course from sessionStorage:", e);
    }
  }, [searchParams]);

  // V1 + V2 selection + change handlers (extracted to colocated hook)
  const {
    handleSelectV1,
    handleCourseChange,
    handleLectureChange,
    handleStepChange,
    handleSelectV2,
    handleCourseV2Change,
    handleLessonV2Change,
    handleBlockV2Change,
    handleBlockV2Delete,
  } = useCourseState({
    course,
    setCourse,
    courseV2,
    setCourseV2,
    selection,
    setSelection,
    setHasChanges,
  });

  // File load / new / export / save
  const handleFileLoad = useCallback((data: unknown, name: string) => {
    const format = detectImportFormat(data);
    switch (format) {
      case "v1_course": {
        const courseData = data as Course;
        setCourse(courseData);
        setCourseV2(null);
        setFilename(name);
        setHasChanges(false);
        setImportVersion("v1");
        setSelection({ version: "v1", type: "course", id: "course", data: courseData });
        break;
      }
      case "v2_package": {
        // Handles all V2 package types: course_v2, lesson_v2, quiz_v2, exercise_v2
        const courseV2Data = migrateCourseBlocks(data as CourseV2);
        setCourseV2(courseV2Data);
        setCourse(null);
        setFilename(name);
        setHasChanges(false);
        setImportVersion("v2");
        setSelection({ version: "v2", type: "course_v2", id: "course_v2", data: courseV2Data });
        break;
      }
      case "v2_block": {
        // Wrap single block in a course for editing
        let blockData = data as BlockV2;
        if (!blockData.export_type) blockData.export_type = "block_v2";
        blockData = migrateBlockToSteps(blockData);
        const wrappedCourse = createCourseV2({
          name: `Block: ${blockData.block_id}`,
          blocks: [blockData],
          lessons: [{
            lesson_id: "imported",
            version: 1,
            name: "Imported Block",
            description: "",
            order: 1,
            blocks: [{ block_id: blockData.block_id, order: 1 }],
          }],
        });
        setCourseV2(wrappedCourse);
        setCourse(null);
        setFilename(name);
        setHasChanges(false);
        setImportVersion("v2");
        setSelection({
          version: "v2", type: "block_v2", id: blockData.block_id,
          lessonId: "imported", data: blockData,
        });
        break;
      }
      default:
        alert(
          "Unknown format. Please load:\n" +
            "- V1: course JSON (export_type: course)\n" +
            "- V2: course_v2, lesson_v2, quiz_v2, exercise_v2, or block_v2 JSON"
        );
    }
  }, []);

  const handleExport = useCallback(() => {
    exportCourse({ course, courseV2, filename, importVersion });
  }, [course, courseV2, filename, importVersion]);

  const handleNew = useCallback(() => {
    const newCourse: Course = { export_type: "course", name: "New Course", description: "", lectures: [] };
    setCourse(newCourse);
    setCourseV2(null);
    setFilename("new-course.json");
    setHasChanges(true);
    setImportVersion("v1");
    setSelection({ version: "v1", type: "course", id: "course", data: newCourse });
  }, []);

  const handleNewV2 = useCallback(() => {
    const newCourseV2 = createCourseV2();
    setCourseV2(newCourseV2);
    setCourse(null);
    setFilename("new-course-v2.json");
    setHasChanges(true);
    setImportVersion("v2");
    setSelection({ version: "v2", type: "course_v2", id: "course_v2", data: newCourseV2 });
  }, []);

  const handleSave = useCallback(() => {
    if (isAdminEdit && courseV2) {
      setShowSaveDialog(true);
    } else {
      setHasChanges(false);
      alert("Changes saved (demo mode - use Export to download)");
    }
  }, [isAdminEdit, courseV2]);

  const handleSaveToServer = async () => {
    if (!courseV2) return;
    try {
      // Auto-increment version
      const updatedCourse: CourseV2 = {
        ...courseV2,
        version: courseV2.version + 1,
        updated: getCurrentTimestamp(),
      };
      await uploadCourse.mutateAsync(updatedCourse);
      setCourseV2(updatedCourse);
      setHasChanges(false);
      setShowSaveDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nepodařilo se uložit kurz");
    }
  };

  // Render
  const hasContent = course || courseV2;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {isAdminEdit && <Navbar />}
      <Toolbar
        filename={filename}
        hasChanges={hasChanges}
        onExport={handleExport}
        onSave={handleSave}
        importVersion={importVersion}
      />

      <div className="flex-1 p-4">
        {!hasContent ? (
          <EmptyState
            onFileLoad={handleFileLoad}
            onNewV2={handleNewV2}
            onNewV1={handleNew}
          />
        ) : (
          <div className="flex gap-4 h-[calc(100vh-120px)]">
            <CourseTreePanel
              importVersion={importVersion}
              course={course}
              courseV2={courseV2}
              selectedId={selection?.id || null}
              onSelectV1={handleSelectV1}
              onSelectV2={handleSelectV2}
              onCourseV2Change={handleCourseV2Change}
            />
            <EditorPanel
              selection={selection}
              courseV2={courseV2}
              vectorDimLabels={vectorDimLabels}
              onCourseChange={handleCourseChange}
              onLectureChange={handleLectureChange}
              onStepChange={handleStepChange}
              onCourseV2Change={handleCourseV2Change}
              onLessonV2Change={handleLessonV2Change}
              onBlockV2Change={handleBlockV2Change}
              onBlockV2Delete={handleBlockV2Delete}
            />
          </div>
        )}
      </div>

      {/* Save confirmation dialog (admin edit mode) */}
      <SaveDialog
        open={showSaveDialog}
        courseV2={courseV2}
        isPending={uploadCourse.isPending}
        onClose={() => setShowSaveDialog(false)}
        onConfirm={handleSaveToServer}
      />
    </div>
  );
}
