import { useState, useMemo } from "react";
import { X, Search, Shield, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTeam } from "@/hooks/useTeam";
import type { Teacher } from "@/types/classroom";

interface AssignTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (teacherIds: number[]) => void;
  isLoading?: boolean;
  assignedTeachers: Teacher[];
}

export function AssignTeachersModal({
  isOpen,
  onClose,
  onAssign,
  isLoading = false,
  assignedTeachers,
}: AssignTeachersModalProps) {
  const { data: teamMembers, isLoading: teamLoading } = useTeam();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const assignedIds = useMemo(
    () => new Set(assignedTeachers.map((t) => t.id)),
    [assignedTeachers]
  );

  const filteredMembers = useMemo(() => {
    if (!teamMembers) return [];
    return teamMembers
      .filter((m) => !assignedIds.has(m.id))
      .filter(
        (m) =>
          !search ||
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      );
  }, [teamMembers, assignedIds, search]);

  if (!isOpen) return null;

  function toggleMember(id: number) {
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
            Přiřadit učitele
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
              placeholder="Hledat členy týmu..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {teamLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Načítání členů týmu...
            </p>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              {search
                ? "Žádní členové neodpovídají hledání"
                : "Všichni členové týmu jsou již přiřazeni"}
            </p>
          ) : (
            <div className="space-y-1">
              {filteredMembers.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-2 py-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {m.role === "admin" ? (
                    <Shield className="w-4 h-4 text-purple-500" />
                  ) : (
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {m.name}
                    </div>
                    <div className="text-xs text-gray-500">{m.email}</div>
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
              : "Vyberte učitele k přiřazení"}
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
