"use client";

import { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Toolbar } from "@/components/Toolbar";
import type { Course } from "@/types/course";
import type { CourseV2, BlockV2 } from "@/types/block-v2";
import {
  createCourseV2,
  createStarterCourseV2,
  getCurrentTimestamp,
  migrateCourseBlocks,
  migrateBlockToSteps,
} from "@/lib/defaults";
import { Navbar } from "@/components/admin/Navbar";
import { useUploadCourse } from "@/hooks/useCourses";
import { useVectorDimensions } from "@/hooks/useSkills";
import { validateCourseGpfVectors } from "@/lib/gpf-vectors";
import type { VectorDimensionLabel } from "@/components/editors/BlockV2Editor";
import type { Course as ApiCourse } from "@/types/api";
import { GenerateDialog } from "@/components/generate/GenerateDialog";
import type { InflatedDraft } from "@/lib/generation/inflate";
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
  const [saveError, setSaveError] = useState<unknown>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const uploadCourse = useUploadCourse();

  // Fetch GPF dimension labels for the course's assigned vector
  const { data: rawDimensions } = useVectorDimensions(editCourseMeta?.vector_id ?? undefined);
  const vectorDimLabels: VectorDimensionLabel[] | undefined = rawDimensions?.map((d) => ({
    index: d.dimension_index,
    code: d.code,
    name: d.name,
    domain_code: d.domain_code,
  }));

  // "Nový kurz" on the Kurzy screen (BR-FZTSDK): a new course in admin edit
  // mode, so Save creates it on the server instead of offering an export. It
  // starts with one lesson and one display block (BR-YZFYPN).
  useEffect(() => {
    if (searchParams.get("new") !== "true") return;
    const newCourseV2 = createStarterCourseV2({ name: "Nový kurz" });
    setEditCourseMeta(null);
    setCourseV2(newCourseV2);
    setCourse(null);
    setFilename(`${newCourseV2.course_id}-v${newCourseV2.version}.json`);
    setHasChanges(true);
    setImportVersion("v2");
    setIsAdminEdit(true);
    setSelection({ version: "v2", type: "course_v2", id: "course_v2", data: newCourseV2 });
  }, [searchParams]);

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

  // AI Course Assistant (BR-D4PE8R): generated lessons and blocks are appended,
  // never merged into existing ones, so nothing an author already wrote can be
  // overwritten by a model. Ids are pre-namespaced (AI_*) by the inflater.
  const handleGeneratedInsert = useCallback(
    (fragment: InflatedDraft) => {
      if (!courseV2) return;

      const updated: CourseV2 = {
        ...courseV2,
        lessons: [...courseV2.lessons, ...fragment.lessons],
        blocks: [...(courseV2.blocks ?? []), ...fragment.blocks],
        updated: getCurrentTimestamp(),
      };

      setCourseV2(updated);
      setHasChanges(true);
      setSelection({ version: "v2", type: "course_v2", id: "course_v2", data: updated });
    },
    [courseV2]
  );

  const handleSave = useCallback(() => {
    if (isAdminEdit && courseV2) {
      setSaveError(null);
      setShowSaveDialog(true);
    } else {
      setHasChanges(false);
      alert("Changes saved (demo mode - use Export to download)");
    }
  }, [isAdminEdit, courseV2]);

  // Blocks whose ELO vectors the app's engine would reject (BR-S9SVNM). The
  // save dialog lists them as a warning; saving is deliberately still allowed
  // so a content fix is never gated on the vectors being correct first.
  const gpfIssues = useMemo(
    () => (courseV2 ? validateCourseGpfVectors(courseV2) : []),
    [courseV2]
  );

  // A course opened with "Nový kurz" (BR-FZTSDK) has no server record until
  // its first save, which hands one back.
  const isNewCourse = isAdminEdit && editCourseMeta === null;

  const handleSaveToServer = async () => {
    if (!courseV2) return;
    setSaveError(null);
    try {
      const updated = getCurrentTimestamp();
      // The server owns the version counter (auto_version): it stores the
      // course as current + 1 and reports the number back, so an editor copy
      // that drifted behind can never deadlock saving (BR-PKYUZC).
      const saved = await uploadCourse.mutateAsync({
        ...courseV2,
        // Only used for a course the server has never seen; for an existing
        // one auto_version overrides it with current + 1. A new course keeps
        // its own version (1) and the strict check, so a course_id that is
        // already taken is refused rather than saved over (BR-FZTSDK).
        version: isNewCourse ? courseV2.version : courseV2.version + 1,
        auto_version: !isNewCourse,
        updated,
      });
      if (isNewCourse) setEditCourseMeta(saved);
      const savedCourse: CourseV2 = {
        ...courseV2,
        version: saved.version,
        updated,
      };
      setCourseV2(savedCourse);
      // Keep the tree selection pointing at the saved course — a stale
      // snapshot here would be written back by the next course-level edit.
      setSelection((current) =>
        current?.version === "v2" && current.type === "course_v2"
          ? { ...current, data: savedCourse }
          : current
      );
      setHasChanges(false);
      setShowSaveDialog(false);
    } catch (err) {
      // Keep the dialog open and show the failure inside it. A rejected save
      // can carry a structure conflict with a list of diverging paths
      // (BR-AYACEK), which an alert() could not render usefully.
      setSaveError(err);
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
        onGenerate={courseV2 ? () => setShowGenerateDialog(true) : undefined}
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

      {/* AI Course Assistant (BR-D4PE8R) */}
      <GenerateDialog
        open={showGenerateDialog}
        courseV2={courseV2}
        onClose={() => setShowGenerateDialog(false)}
        onInsert={handleGeneratedInsert}
      />

      {/* Save confirmation dialog (admin edit mode) */}
      <SaveDialog
        open={showSaveDialog}
        courseV2={courseV2}
        isPending={uploadCourse.isPending}
        error={saveError}
        gpfIssues={gpfIssues}
        isNew={isNewCourse}
        onClose={() => { setShowSaveDialog(false); setSaveError(null); }}
        onConfirm={handleSaveToServer}
      />
    </div>
  );
}
