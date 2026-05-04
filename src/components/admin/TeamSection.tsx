"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Shield, GraduationCap, Search, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useTeam,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  TeamMember,
} from "@/hooks/useTeam";
import { cn } from "@/lib/utils";

export function TeamSection({ roleFilter }: { roleFilter?: "teacher" | "admin" } = {}) {
  const { data: members, isLoading, error } = useTeam();
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">(roleFilter ?? "teacher");
  const [formError, setFormError] = useState("");

  // Edit dialog state
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "teacher">("teacher");
  const [editError, setEditError] = useState("");

  const filteredMembers = useMemo(() => {
    if (!members) return [];
    let result = members;
    if (roleFilter) {
      result = result.filter((m) => m.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [members, searchQuery, roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      await createMutation.mutateAsync({ name, email, role });
      setName("");
      setEmail("");
      setRole("teacher");
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při vytváření účtu");
    }
  };

  const openEdit = (member: TeamMember) => {
    setEditMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setEditError("");

    try {
      await updateMutation.mutateAsync({
        id: editMember.id,
        name: editName,
        email: editEmail,
        role: editRole,
      });
      setEditMember(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  };

  const handleDelete = async (id: number, memberName: string) => {
    if (!confirm(`Opravdu chcete odebrat ${memberName} z týmu?`)) return;

    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Chyba při načítání týmu: {error instanceof Error ? error.message : "Neznámá chyba"}
      </div>
    );
  }

  return (
    <div>
      {/* Search + Create */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Hledat člena podle jména nebo e-mailu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Přidat člena
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nový člen týmu</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Jméno"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "teacher")}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="teacher">Učitel</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" isLoading={createMutation.isPending}>
                Vytvořit
              </Button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(""); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Zrušit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit dialog */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Upravit člena týmu</h3>
              <button
                onClick={() => setEditMember(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Jméno</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "admin" | "teacher")}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="teacher">Učitel</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {editError && (
                <p className="text-sm text-red-600">{editError}</p>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Zrušit
                </button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Uložit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Team list */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-600">
            {searchQuery ? "Žádní členové neodpovídají hledání" : "Zatím žádní členové týmu."}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Člen
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Role
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {member.name}
                      </div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium",
                        member.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {member.role === "admin" ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <GraduationCap className="w-3 h-3" />
                      )}
                      {member.role === "admin" ? "Admin" : "Učitel"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(member)}
                        className="inline-flex items-center justify-center rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 h-8 w-8 transition-colors"
                        title="Upravit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 h-8 w-8 transition-colors"
                        title="Odebrat z týmu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
