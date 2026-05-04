"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useCourse, useCourseData } from "@/hooks/useCourses";
import { LoadingPage } from "@/components/ui/LoadingSpinner";

export default function CourseJsonPage({
  params,
}: {
  params: { id: string };
}) {
  const courseId = Number(params.id);
  const { data: course } = useCourse(courseId);
  const { data: courseData, isLoading, error } = useCourseData(courseId);

  if (isLoading) {
    return <LoadingPage message="Stahování JSON kurzu..." />;
  }

  if (error || !courseData) {
    return (
      <div>
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Kurzy
        </Link>
        <p className="text-red-500">Nepodařilo se načíst data kurzu</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        <ArrowLeft className="w-4 h-4" />
        Courses
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {course?.emoji && <span className="mr-2">{course.emoji}</span>}
        {course?.name ?? courseData.name}
      </h1>
      <p className="text-gray-500 mb-4">Kompletní JSON kurzu</p>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-x-auto">
        <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">
          {JSON.stringify(courseData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
