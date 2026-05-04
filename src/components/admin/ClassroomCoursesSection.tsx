import { useState } from "react";
import { Plus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useClassroomCourses,
  useAssignCourses,
  useRemoveCourse,
} from "@/hooks/useClassrooms";
import { AssignCoursesModal } from "./AssignCoursesModal";

interface ClassroomCoursesSectionProps {
  classroomId: number;
}

export function ClassroomCoursesSection({
  classroomId,
}: ClassroomCoursesSectionProps) {
  const { data: courses, isLoading } = useClassroomCourses(classroomId);
  const assignMutation = useAssignCourses();
  const removeMutation = useRemoveCourse();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleAssign(courseIds: number[]) {
    assignMutation.mutate(
      { classroomId, course_ids: courseIds },
      { onSuccess: () => setIsModalOpen(false) }
    );
  }

  function handleRemove(courseId: number) {
    removeMutation.mutate({ classroomId, courseId });
  }

  const assignedCourses = courses ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Přiřazené kurzy
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Přiřadit kurz
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500 py-4">Načítání...</p>
      ) : assignedCourses.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Žádné přiřazené kurzy</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assignedCourses.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg leading-none">{c.emoji || "📚"}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {c.name}
                  </div>
                  {c.assigned_at && (
                    <div className="text-xs text-gray-500">
                      Přiřazeno{" "}
                      {new Date(c.assigned_at).toLocaleDateString("cs-CZ", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(c.id)}
                disabled={removeMutation.isPending}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Odebrat kurz"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AssignCoursesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssign={handleAssign}
        isLoading={assignMutation.isPending}
        assignedCourses={assignedCourses}
      />
    </div>
  );
}
