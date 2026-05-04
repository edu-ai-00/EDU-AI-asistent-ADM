import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Classroom } from "@/types/classroom";

interface EditClassroomModalProps {
  isOpen: boolean;
  classroom: Classroom;
  onClose: () => void;
  onSave: (name: string) => void;
  isLoading?: boolean;
}

export function EditClassroomModal({
  isOpen,
  classroom,
  onClose,
  onSave,
  isLoading = false,
}: EditClassroomModalProps) {
  const [name, setName] = useState(classroom.name);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(classroom.name);
  }, [classroom]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Zadejte název třídy");
      return;
    }
    onSave(trimmed);
  };

  const handleClose = () => {
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
          <h2 className="text-lg font-semibold text-gray-900">
            Upravit třídu
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

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
              Uložit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
