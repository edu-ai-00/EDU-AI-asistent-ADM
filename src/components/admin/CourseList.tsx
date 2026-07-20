"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertCircle, Upload, Eye, EyeOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCourses, useDeleteCourse, useUploadCourse, useRestoreCourse } from "@/hooks/useCourses";
import { useVectors } from "@/hooks/useSkills";
import { CourseCard } from "./CourseCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingPage, LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { UploadCourseModal } from "./UploadCourseModal";
import { ExportEloDialog } from "./ExportEloDialog";
import { ExportAnswersDialog } from "./ExportAnswersDialog";
import type { Course, DownloadResponse } from "@/types/api";
import type { CourseV2 } from "@/types/block-v2";
import { api } from "@/lib/api/client";

export function CourseList() {
  const router = useRouter();
  const [showDeleted, setShowDeleted] = useState(false);
  const { data: courses, isLoading, error } = useCourses(showDeleted);
  const deleteCourse = useDeleteCourse();
  const uploadCourse = useUploadCourse();
  const restoreCourse = useRestoreCourse();
  const queryClient = useQueryClient();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForCourse, setUploadForCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingCourseId, setLoadingCourseId] = useState<number | null>(null);

  // Fetch GPF vectors for name lookup (vector_id is on the Course object directly)
  const { data: vectors } = useVectors();
  const vectorMap = useMemo(
    () => new Map(vectors?.map((v) => [v.id, v.name]) ?? []),
    [vectors]
  );

  // For status change action - track which course we're updating
  const [statusChangingId, setStatusChangingId] = useState<number | null>(null);
  // Export ELO dialog
  const [exportCourse, setExportCourse] = useState<Course | null>(null);
  // Export answers (questionnaire) dialog
  const [answersExportCourse, setAnswersExportCourse] = useState<Course | null>(null);

  if (isLoading) {
    return <LoadingPage message="Načítání kurzů..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst kurzy</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  const filteredCourses = courses?.filter(
    (course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.course_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const handleDelete = async (courseId: number) => {
    if (confirm("Opravdu chcete smazat tento kurz? Tuto akci nelze vrátit zpět.")) {
      await deleteCourse.mutateAsync(courseId);
    }
  };

  const handleEdit = async (course: Course) => {
    try {
      setLoadingCourseId(course.id);
      // Download the course JSON from API
      const downloadInfo = await api.get<DownloadResponse>(`/admin/courses/${course.id}/download`);
      const response = await fetch(downloadInfo.download_url);
      if (!response.ok) throw new Error("Failed to download course");
      const courseData = await response.json() as CourseV2;

      // Store in sessionStorage for the editor to pick up
      sessionStorage.setItem("editCourse", JSON.stringify(courseData));
      sessionStorage.setItem("editCourseMeta", JSON.stringify(course));

      // Navigate to the editor
      router.push("/?edit=true");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nepodařilo se načíst kurz k úpravě");
    } finally {
      setLoadingCourseId(null);
    }
  };

  const handleUploadNewVersion = (course: Course) => {
    setUploadForCourse(course);
    setIsUploadModalOpen(true);
  };

  const handleStatusChange = async (course: Course, status: Course["status"]) => {
    try {
      setStatusChangingId(course.id);
      await api.put(`/courses/${course.id}`, { status });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nepodařilo se změnit stav kurzu");
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleRestore = async (course: Course) => {
    try {
      setStatusChangingId(course.id);
      await restoreCourse.mutateAsync(course.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nepodařilo se obnovit kurz");
    } finally {
      setStatusChangingId(null);
    }
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadForCourse(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Hledat kurzy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeleted(!showDeleted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showDeleted
                ? "bg-red-50 text-red-700 hover:bg-red-100"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDeleted ? "Skrýt smazané" : "Zobrazit smazané"}
          </button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4" />
            Nahrát kurz
          </Button>
        </div>
      </div>

      {filteredCourses?.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {searchQuery ? (
            <>
              <p className="text-gray-600 mb-2">Žádné kurzy neodpovídají hledání</p>
              <Button variant="ghost" onClick={() => setSearchQuery("")}>
                Zrušit hledání
              </Button>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Zatím žádné kurzy. Nahrajte JSON soubor kurzu.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Nahrát první kurz
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCourses?.map((course) => (
            <div key={course.id} className="relative">
              {(loadingCourseId === course.id || statusChangingId === course.id) && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <LoadingSpinner />
                </div>
              )}
              <CourseCard
                course={course}
                gpfVectorName={course.vector_id ? vectorMap.get(course.vector_id) : undefined}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onUploadNewVersion={handleUploadNewVersion}
                onStatusChange={handleStatusChange}
                onRestore={handleRestore}
                onExport={setExportCourse}
                onExportAnswers={setAnswersExportCourse}
              />
            </div>
          ))}
        </div>
      )}

      <UploadCourseModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUploadModal}
        onSubmit={async (data) => {
          await uploadCourse.mutateAsync(data);
          handleCloseUploadModal();
        }}
        isLoading={uploadCourse.isPending}
        updateForCourse={uploadForCourse}
      />

      <ExportEloDialog
        course={exportCourse}
        onClose={() => setExportCourse(null)}
      />

      <ExportAnswersDialog
        course={answersExportCourse}
        onClose={() => setAnswersExportCourse(null)}
      />
    </div>
  );
}
