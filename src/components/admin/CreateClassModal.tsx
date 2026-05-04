import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TeamMember } from "@/hooks/useTeam";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, count: number, teacherIds: number[]) => void;
  isLoading?: boolean;
  teachers?: TeamMember[];
}

export function CreateClassModal({
  isOpen,
  onClose,
  onCreate,
  isLoading = false,
  teachers = [],
}: CreateClassModalProps) {
  const [name, setName] = useState("");
  const [count, setCount] = useState(25);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Zadejte název třídy");
      return;
    }
    if (count < 1 || count > 50) {
      setError("Počet žáků musí být 1–50");
      return;
    }
    onCreate(trimmed, count, selectedTeacherIds);
  };

  const handleClose = () => {
    setName("");
    setCount(25);
    setSelectedTeacherIds([]);
    setError(null);
    onClose();
  };

  function toggleTeacher(id: number) {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Nová třída
          </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Název třídy
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="např. 5.B Matematika"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Počet žáků
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={50}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {teachers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Učitelé
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {teachers.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeacherIds.includes(t.id)}
                      onChange={() => toggleTeacher(t.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{t.name}</span>
                    <span className="text-xs text-gray-500">{t.email}</span>
                  </label>
                ))}
              </div>
              {selectedTeacherIds.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">
                  Pokud nevyberete, budete přiřazeni automaticky.
                </p>
              )}
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
            <Button type="submit" isLoading={isLoading}>
              Vytvořit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
