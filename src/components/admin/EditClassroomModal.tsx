import { useState, useEffect } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Classroom } from "@/types/classroom";

/** Four characters, A–Z or 0–9 — the same rule the API enforces. */
const JOIN_CODE_PATTERN = /^[A-Z0-9]{4}$/;

interface EditClassroomModalProps {
  isOpen: boolean;
  classroom: Classroom;
  onClose: () => void;
  /** joinCode is null when the field was left empty (joining switched off). */
  onSave: (name: string, joinCode: string | null) => void;
  isLoading?: boolean;
  /** What the API refused the last save with, e.g. a code already taken. */
  serverError?: string | null;
}

export function EditClassroomModal({
  isOpen,
  classroom,
  onClose,
  onSave,
  isLoading = false,
  serverError = null,
}: EditClassroomModalProps) {
  const [name, setName] = useState(classroom.name);
  const [joinCode, setJoinCode] = useState(classroom.join_code ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(classroom.name);
    setJoinCode(classroom.join_code ?? "");
  }, [classroom]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Zadejte název třídy");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (code && !JOIN_CODE_PATTERN.test(code)) {
      setError("Kód třídy musí mít přesně 4 znaky – písmena A–Z nebo číslice.");
      return;
    }
    setError(null);
    onSave(trimmed, code || null);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const shownError = error ?? serverError;

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
          {shownError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{shownError}</span>
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

          {/* BR-TT6TD7: optional class code for self-service joining. */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kód třídy <span className="font-normal text-gray-400">(volitelné)</span>
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) =>
                setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              maxLength={4}
              placeholder="např. 7A24"
              autoComplete="off"
              spellCheck={false}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Samoobslužný vstup žáků do třídy. Žák zadá kód v aplikaci
              (Můj profil → Upravit profil → Připojit ke třídě) nebo otevře
              odkaz /join/{joinCode || "KÓD"}. 4 znaky, písmena A–Z nebo
              číslice. Nechte prázdné, pokud se žáci nemají připojovat sami.
            </p>
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
