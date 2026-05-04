import { useState } from "react";
import { X, AlertCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AddStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (count: number) => void;
  isLoading?: boolean;
  classroomName: string;
}

export function AddStudentsModal({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
  classroomName,
}: AddStudentsModalProps) {
  const [count, setCount] = useState(5);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1 || count > 50) {
      setError("Počet žáků musí být 1–50");
      return;
    }
    onAdd(count);
  };

  const handleClose = () => {
    setCount(5);
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
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Přidat žáky
            </h2>
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

          <p className="text-sm text-gray-600">
            Noví žáci budou přidáni do třídy <strong>{classroomName}</strong>.
            Každému bude vygenerována přezdívka a přihlašovací kód.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Počet nových žáků
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={50}
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
              <UserPlus className="w-4 h-4" />
              Přidat {count} {count === 1 ? "žáka" : count < 5 ? "žáky" : "žáků"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
