import { useState } from "react";
import { Plus, X, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useUpdateClassroom } from "@/hooks/useClassrooms";
import { AssignTeachersModal } from "./AssignTeachersModal";
import type { Teacher } from "@/types/classroom";

interface ClassroomTeachersSectionProps {
  classroomId: number;
  teachers: Teacher[];
}

export function ClassroomTeachersSection({
  classroomId,
  teachers,
}: ClassroomTeachersSectionProps) {
  const updateMutation = useUpdateClassroom();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleAssign(newTeacherIds: number[]) {
    const currentIds = teachers.map((t) => t.id);
    const mergedIds = Array.from(new Set([...currentIds, ...newTeacherIds]));
    updateMutation.mutate(
      { id: classroomId, teacher_ids: mergedIds },
      { onSuccess: () => setIsModalOpen(false) }
    );
  }

  function handleRemove(teacherId: number) {
    const remainingIds = teachers.filter((t) => t.id !== teacherId).map((t) => t.id);
    updateMutation.mutate({ id: classroomId, teacher_ids: remainingIds });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Přiřazení učitelé
        </h3>
        <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Přidat učitele
        </Button>
      </div>

      {teachers.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <GraduationCap className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Žádní přiřazení učitelé</p>
        </div>
      ) : (
        <div className="space-y-2">
          {teachers.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <GraduationCap className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {t.name}
                  </div>
                  {t.email && (
                    <div className="text-xs text-gray-500">{t.email}</div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(t.id)}
                disabled={updateMutation.isPending}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Odebrat učitele"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AssignTeachersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAssign={handleAssign}
        isLoading={updateMutation.isPending}
        assignedTeachers={teachers}
      />
    </div>
  );
}
