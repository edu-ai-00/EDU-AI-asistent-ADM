"use client";

import { useState, useRef } from "react";
import { X, Upload, FileJson, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CourseV2 } from "@/types/block-v2";
import type { Course } from "@/types/api";
import { isV2Package } from "@/types/block-v2";
import { ApiError } from "@/lib/api/client";

interface UploadCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CourseV2) => Promise<void>;
  isLoading: boolean;
  updateForCourse?: Course | null;
}

export function UploadCourseModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  updateForCourse,
}: UploadCourseModalProps) {
  const [courseData, setCourseData] = useState<CourseV2 | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUpdate = !!updateForCourse;

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Validate it's a V2 course/exercise/quiz
      if (!isV2Package(json)) {
        setError("Neplatný formát souboru. Očekáván export_type: course_v2, exercise_v2 nebo quiz_v2.");
        setCourseData(null);
        return;
      }

      const parsed = json as CourseV2;

      // If updating, validate course_id matches and version is higher
      if (updateForCourse) {
        if (parsed.course_id !== updateForCourse.course_id) {
          setError(`Neshodné ID kurzu. Očekáváno „${updateForCourse.course_id}", ale nalezeno „${parsed.course_id}".`);
          setCourseData(null);
          return;
        }
        if (parsed.version <= updateForCourse.version) {
          setError(`Verze musí být vyšší než aktuální (${updateForCourse.version}). Nalezena verze ${parsed.version}.`);
          setCourseData(null);
          return;
        }
      }

      setCourseData(parsed);
    } catch {
      setError("Nepodařilo se zpracovat JSON soubor. Zkontrolujte formát.");
      setCourseData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseData) {
      setError("Nejprve vyberte soubor kurzu");
      return;
    }

    try {
      await onSubmit(courseData);
      // Reset form
      setCourseData(null);
      setFileName(null);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // Extract clean validation error message
        const firstValidation = err.errors
          ? Object.values(err.errors).flat()[0]
          : undefined;
        setError(firstValidation || err.message);
      } else {
        setError(err instanceof Error ? err.message : "Nepodařilo se nahrát kurz");
      }
    }
  };

  const handleClose = () => {
    setCourseData(null);
    setFileName(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isUpdate ? "Nahrát novou verzi" : "Nahrát kurz"}
            </h2>
            {isUpdate && updateForCourse && (
              <p className="text-sm text-gray-500 mt-0.5">
                {updateForCourse.name} (v{updateForCourse.version})
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              {fileName ? (
                <>
                  <FileJson className="w-12 h-12 text-blue-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    {fileName}
                  </span>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {isUpdate
                      ? "Klikněte pro výběr JSON souboru nové verze"
                      : "Klikněte pro výběr JSON souboru kurzu"}
                  </span>
                </>
              )}
            </button>
          </div>

          {courseData && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h3 className="font-medium text-gray-900">{courseData.name}</h3>
              <p className="text-sm text-gray-500">{courseData.course_id}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className={isUpdate ? "text-green-600 font-medium" : ""}>
                  Verze {courseData.version}
                  {isUpdate && updateForCourse && ` (byla v${updateForCourse.version})`}
                </span>
                <span>{courseData.lessons.length} lekcí</span>
                <span>{courseData.blocks?.length || 0} bloků</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!courseData}
            >
              <Upload className="w-4 h-4" />
              {isUpdate ? "Nahrát novou verzi" : "Nahrát kurz"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
