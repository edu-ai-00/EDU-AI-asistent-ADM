import { CourseList } from "@/components/admin/CourseList";

export default function CoursesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kurzy</h1>
        <p className="text-gray-600 mt-1">
          Správa kurzů a vzdělávacího obsahu
        </p>
      </div>

      <CourseList />
    </div>
  );
}
