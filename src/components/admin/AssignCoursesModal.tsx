import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCourses } from "@/hooks/useCourses";
import type { AssignedCourse } from "@/types/classroom";

interface AssignCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (courseIds: number[]) => void;
  isLoading?: boolean;
  assignedCourses: AssignedCourse[];
}

export function AssignCoursesModal({
  isOpen,
  onClose,
  onAssign,
  isLoading = false,
  assignedCourses,
}: AssignCoursesModalProps) {
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const assignedIds = useMemo(
    () => new Set(assignedCourses.map((c) => c.id)),
    [assignedCourses]
  );

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    return courses
      .filter((c) => !assignedIds.has(c.id))
      .filter(
        (c) =>
          !search ||
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.course_id.toLowerCase().includes(search.toLowerCase())
      );
  }, [courses, assignedIds, search]);

  if (!isOpen) return null;

  function toggleCourse(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    if (selectedIds.length === 0) return;
    onAssign(selectedIds);
  }

  const handleClose = () => {
    setSearch("");
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Přiřadit kurzy
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hledat kurzy..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {coursesLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Načítání kurzů...
            </p>
          ) : filteredCourses.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {search
                ? "Žádné kurzy neodpovídají hledání"
                : "Všechny kurzy jsou již přiřazeny"}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredCourses.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleCourse(c.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-lg leading-none">
                    {c.emoji || "📚"}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.course_id}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-lg">
          <span className="text-sm text-gray-500">
            {selectedIds.length > 0
              ? `Vybráno: ${selectedIds.length}`
              : "Vyberte kurzy k přiřazení"}
          </span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
              Zrušit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedIds.length === 0}
              isLoading={isLoading}
            >
              Přiřadit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
