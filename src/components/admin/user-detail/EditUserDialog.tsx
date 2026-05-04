"use client";

import { useState } from "react";
import { useUpdateUser } from "@/hooks/useUsers";
import { useClassrooms } from "@/hooks/useClassrooms";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EditUserDialog({
  user,
  open,
  onClose,
}: {
  user: { id: number; name: string; email: string; role: string; classroom_id: number | null };
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role || "student");
  const [classroomId, setClassroomId] = useState<number | null>(user.classroom_id);
  const [formError, setFormError] = useState("");
  const updateMutation = useUpdateUser();
  const { data: classrooms } = useClassrooms();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        name,
        email: email || null,
        classroom_id: classroomId,
        role: role as "student" | "teacher" | "admin",
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Upravit uživatele">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Jméno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="student">Student</option>
            <option value="teacher">Učitel</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Třída
          </label>
          <select
            value={classroomId ?? ""}
            onChange={(e) => setClassroomId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Bez třídy</option>
            {classrooms?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            Zrušit
          </Button>
          <Button type="submit" isLoading={updateMutation.isPending}>
            Uložit
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
