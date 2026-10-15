"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Shield,
  GraduationCap,
  Search,
  Pencil,
  X,
  Ban,
  UserCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  useTeam,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
  useResendTeamInvite,
  TeamMember,
  TeamRole,
  TeamStatus,
} from "@/hooks/useTeam";
import { useSetUserActive } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ALL_SCHOOLS, listedAsTeacher, matchesSchool, schoolOptions } from "@/lib/school-filter";
import { SchoolPicker } from "./SchoolPicker";
import { SchoolFilterSelect } from "./SchoolFilterSelect";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("cs-CZ");

/** Account state badge (BR-XW6CWV). */
function StatusBadge({ member }: { member: TeamMember }) {
  const styles: Record<TeamStatus, string> = {
    invited: "bg-amber-100 text-amber-800",
    expired: "bg-orange-100 text-orange-800",
    active: "bg-green-100 text-green-700",
    // Same red as the student list's badge (BR-Q3ZJ6Q).
    deactivated: "bg-red-100 text-red-700",
  };

  const label: Record<TeamStatus, string> = {
    invited: member.invite_expires_at
      ? `Pozván · do ${formatDate(member.invite_expires_at)}`
      : "Pozván",
    expired: "Pozvánka vypršela",
    active: "Aktivní",
    deactivated: "Deaktivován",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap",
        styles[member.status]
      )}
    >
      {label[member.status]}
    </span>
  );
}

export function TeamSection({ roleFilter }: { roleFilter?: "teacher" | "admin" } = {}) {
  const { data: members, isLoading, error } = useTeam();
  const createMutation = useCreateTeamMember();
  const updateMutation = useUpdateTeamMember();
  const deleteMutation = useDeleteTeamMember();
  const resendMutation = useResendTeamInvite();
  const setActiveMutation = useSetUserActive();
  const { user: me } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "teacher">(roleFilter ?? "teacher");
  const [schoolIds, setSchoolIds] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");
  // Shown after an invite that did not go the usual way (BR-A7KEZ6).
  const [notice, setNotice] = useState("");

  // Edit dialog state
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<TeamRole>("teacher");
  const [editSchoolIds, setEditSchoolIds] = useState<number[]>([]);
  const [editError, setEditError] = useState("");

  // Schools only mean something for teachers (BR-R84FVD): they widen a
  // teacher's classroom list, while an admin already sees every class.
  const showSchools = roleFilter !== "admin";
  const [schoolFilter, setSchoolFilter] = useState(ALL_SCHOOLS);

  // The Učitelé tab also lists admins filed under a school (BR-A7KEZ6).
  const roleMembers = useMemo(
    () =>
      (members ?? []).filter((m) =>
        roleFilter === "teacher" ? listedAsTeacher(m) : !roleFilter || m.role === roleFilter
      ),
    [members, roleFilter]
  );

  const filterSchools = useMemo(
    () => schoolOptions(roleMembers.map((m) => m.schools ?? [])),
    [roleMembers]
  );

  const filteredMembers = useMemo(() => {
    let result = roleMembers;
    if (showSchools) {
      result = result.filter((m) => matchesSchool(m.schools ?? [], schoolFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
      );
    }
    return result;
  }, [roleMembers, searchQuery, showSchools, schoolFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setNotice("");

    try {
      const member = await createMutation.mutateAsync({
        name,
        email,
        role,
        school_ids: role === "teacher" ? schoolIds : undefined,
      });
      // An admin invited as a teacher stays an admin — the API only files
      // them under the picked schools and sends nothing (BR-A7KEZ6).
      if (role === "teacher" && member.role === "admin") {
        setNotice(
          `${member.email} už patří adminovi ${member.name}. Admin má všechna práva učitele, ` +
            "proto účet zůstává adminem a žádná pozvánka se neposílá. " +
            (member.schools.length > 0
              ? `Mezi učiteli je veden ve škole: ${member.schools.map((s) => s.name).join(", ")}.`
              : "Mezi učiteli se zobrazí, až mu přiřadíte školu.")
        );
      }
      setName("");
      setEmail("");
      setRole("teacher");
      setSchoolIds([]);
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
    setEditSchoolIds((member.schools ?? []).map((s) => s.id));
    setEditError("");
  };

  // On the Učitelé tab an admin's schools are what list them there, so the
  // picker is how they come off it again (BR-A7KEZ6).
  const editShowsSchools =
    editRole === "teacher" || (editRole === "admin" && roleFilter === "teacher");

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
        // Left out wherever the picker is hidden, so the schools are untouched.
        school_ids: editShowsSchools ? editSchoolIds : undefined,
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

  // Poslat pozvánku znovu (BR-XW6CWV) — same account, fresh 7-day window.
  const handleResend = async (member: TeamMember) => {
    if (!confirm(`Poslat pozvánku znovu na ${member.email}? Platnost se obnoví.`)) return;
    setActionError("");

    try {
      await resendMutation.mutateAsync(member.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Pozvánku se nepodařilo odeslat");
    }
  };

  // Deaktivovat / Reaktivovat (BR-Q3ZJ6Q) — unlike "Odebrat z týmu" this
  // keeps the role and locks the person out of the panel and the app alike.
  const handleToggleActive = async (member: TeamMember) => {
    const deactivating = !member.deactivated_at;
    if (
      deactivating &&
      !confirm(
        `Opravdu chcete deaktivovat účet ${member.name}? Účet bude okamžitě odhlášen a nepůjde se do něj přihlásit, dokud ho znovu neaktivujete.`,
      )
    ) {
      return;
    }

    try {
      await setActiveMutation.mutateAsync({ id: member.id, active: !deactivating });
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
        <div className="flex items-center gap-2">
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
          {showSchools && (
            <SchoolFilterSelect
              options={filterSchools}
              showUnfiled={roleMembers.some((m) => (m.schools ?? []).length === 0)}
              value={schoolFilter}
              onChange={setSchoolFilter}
            />
          )}
        </div>
        <Button
          onClick={() => { setShowForm(!showForm); setNotice(""); }}
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
            {/* Several schools at once (BR-R84FVD), where the invite form
                used to offer a single one. */}
            {role === "teacher" && (
              <SchoolPicker value={schoolIds} onChange={setSchoolIds} />
            )}
            <p className="text-xs text-gray-500">
              Pozvánka platí 7 dní — do té doby se musí pozvaný poprvé přihlásit, jinak ji
              bude potřeba poslat znovu. Pokud e-mail už patří studentovi, jeho účet se
              povýší na člena týmu (zůstane stejný účet i jeho data), žádný nový se nevytvoří.
              {role === "teacher" &&
                " Pokud patří adminovi, zůstane adminem a jen se zařadí do vybraných škol."}
            </p>
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
                  onChange={(e) => setEditRole(e.target.value as TeamRole)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                >
                  <option value="teacher">Učitel</option>
                  <option value="admin">Admin</option>
                  <option value="student">Student</option>
                </select>
                {editRole === "student" && (
                  <p className="text-xs text-amber-700 mt-1.5">
                    Uložením přijde {editMember.name} o přístup do administrace a zmizí ze
                    seznamu týmu. Účet i data zůstanou zachované.
                  </p>
                )}
              </div>
              {editShowsSchools && (
                <SchoolPicker value={editSchoolIds} onChange={setEditSchoolIds} />
              )}
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

      {actionError && (
        <p className="mb-3 text-sm text-red-600">{actionError}</p>
      )}

      {notice && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p>{notice}</p>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-amber-600 hover:text-amber-800"
            title="Zavřít"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Team list */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-600">
            {searchQuery || schoolFilter !== ALL_SCHOOLS
              ? "Žádní členové neodpovídají hledání"
              : "Zatím žádní členové týmu."}
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
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Stav
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  Akce
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className={cn("hover:bg-gray-50", member.deactivated_at && "bg-gray-50/60")}>
                  <td className="px-4 py-3">
                    <div>
                      {/* The "deaktivován" state sits in the Stav column (BR-XW6CWV). */}
                      <div className={cn("text-sm font-medium", member.deactivated_at ? "text-gray-500" : "text-gray-900")}>
                        {member.name}
                      </div>
                      <div className="text-xs text-gray-500">{member.email}</div>
                      {member.schools.length > 0 && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          {member.schools.map((s) => s.name).join(", ")}
                        </div>
                      )}
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
                  <td className="px-4 py-3">
                    <StatusBadge member={member} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {(member.status === "invited" || member.status === "expired") && (
                        <button
                          onClick={() => handleResend(member)}
                          disabled={resendMutation.isPending}
                          className="inline-flex items-center justify-center rounded-md hover:bg-amber-50 text-gray-400 hover:text-amber-600 h-8 w-8 transition-colors"
                          title="Poslat pozvánku znovu"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(member)}
                        className="inline-flex items-center justify-center rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 h-8 w-8 transition-colors"
                        title="Upravit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {me?.id !== member.id && (
                        <button
                          onClick={() => handleToggleActive(member)}
                          disabled={setActiveMutation.isPending}
                          className={cn(
                            "inline-flex items-center justify-center rounded-md text-gray-400 h-8 w-8 transition-colors",
                            member.deactivated_at
                              ? "hover:bg-green-50 hover:text-green-600"
                              : "hover:bg-red-50 hover:text-red-600"
                          )}
                          title={member.deactivated_at ? "Reaktivovat" : "Deaktivovat"}
                        >
                          {member.deactivated_at ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      )}
                      {/* Removing from the team makes an admin a student, which
                          is not what taking them off the teachers means — on
                          this tab that is unfiling their schools (BR-A7KEZ6). */}
                      {!(roleFilter === "teacher" && member.role === "admin") && (
                        <button
                          onClick={() => handleDelete(member.id, member.name)}
                          disabled={deleteMutation.isPending}
                          className="inline-flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 h-8 w-8 transition-colors"
                          title="Odebrat z týmu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
