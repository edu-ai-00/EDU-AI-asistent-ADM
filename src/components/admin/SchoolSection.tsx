"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Search, Building2, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Dialog } from "@/components/ui/Dialog";
import {
  useSchools,
  useCreateSchool,
  useUpdateSchool,
  useDeleteSchool,
  useSyncSchoolClassrooms,
} from "@/hooks/useSchools";
import {
  useClassrooms,
  useCreateClassroom,
  useUpdateClassroom,
} from "@/hooks/useClassrooms";
import {
  useTeam,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from "@/hooks/useTeam";
import { generateStudents } from "@/lib/classroom";
import {
  classroomCandidates,
  classroomsOf,
  teacherCandidates,
  teacherRemoval,
  withId,
  withoutId,
} from "@/lib/school-roster";
import type { School, SchoolTeacher } from "@/types/school";
import type { Classroom } from "@/types/classroom";

// Copy of pluralCs from lib/notifications, which this release does not ship.
// The next staging → main release brings that module back; import it from
// there again then.
function pluralCs(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  if (abs >= 2 && abs <= 4) return few;
  return many;
}

/**
 * Schools as organisational units (BR-8QAWKP).
 *
 * Admin-only, and mounted that way in the users page — assigning a teacher to
 * a school is what widens their classroom list, so it stays an admin decision
 * end to end (the API refuses it from a teacher regardless).
 */
export function SchoolSection() {
  const { data: schools, isLoading, error } = useSchools();
  const deleteMutation = useDeleteSchool();

  const [searchQuery, setSearchQuery] = useState("");
  // "new" opens the dialog empty; an id opens that school's settings.
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const filtered = useMemo(() => {
    if (!schools) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.identifier?.toLowerCase().includes(q)
    );
  }, [schools, searchQuery]);

  async function handleDelete(school: School) {
    if (
      !confirm(
        `Opravdu smazat školu ${school.name}? Její třídy zůstanou zachovány, jen přestanou být zařazené.`
      )
    ) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(school.id);
    } catch (err) {
      console.error(err);
    }
  }

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
        Chyba při načítání škol:{" "}
        {error instanceof Error ? error.message : "Neznámá chyba"}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Hledat školu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-4 h-4" />
          Nová škola
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {searchQuery ? (
            <p className="text-gray-600">Žádné školy neodpovídají hledání</p>
          ) : (
            <>
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Zatím žádné školy</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Škola</th>
                <th className="px-4 py-3">Učitelé</th>
                <th className="px-4 py-3 text-center">Tříd</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {(s.address || s.identifier) && (
                      <div className="text-xs text-gray-500">
                        {[s.address, s.identifier].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {s.teachers.length > 0 ? (
                      s.teachers.map((t) => t.name).join(", ")
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {s.classrooms_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(s.id)}
                        className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                        title="Upravit školu, její učitele a třídy"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors"
                        title="Smazat"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== null && (
        <SchoolDialog
          initialSchoolId={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// School settings: details, then the school's own teachers and classes
// ---------------------------------------------------------------------------

/**
 * BR-9Z59Z9: the dialog used to list every teacher account in the system as
 * checkboxes, and the classes sat behind a second icon. It now lists only who
 * and what belongs to this school, each with Upravit / Odebrat, and offers
 * the rest through Přidat — an existing account or class, or a new one.
 *
 * The name, address and identifier save with the dialog's Uložit; the two
 * lists act on the spot, because what they do does not wait for a dialog
 * anyway (an invite e-mail, a role change, a new class with its pupils).
 * A school being created gets its lists as soon as it exists.
 */
function SchoolDialog({
  initialSchoolId,
  onClose,
}: {
  initialSchoolId: number | null;
  onClose: () => void;
}) {
  const { data: schools } = useSchools();
  const createMutation = useCreateSchool();
  const updateMutation = useUpdateSchool();

  const [schoolId, setSchoolId] = useState<number | null>(initialSchoolId);
  // Bridges the moment between creating a school and the list refetching it.
  const [created, setCreated] = useState<School | null>(null);
  const school =
    schoolId === null
      ? null
      : schools?.find((s) => s.id === schoolId) ?? (created?.id === schoolId ? created : null);

  const [name, setName] = useState(school?.name ?? "");
  const [address, setAddress] = useState(school?.address ?? "");
  const [identifier, setIdentifier] = useState(school?.identifier ?? "");
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Zadejte název školy");
      return;
    }
    setFormError("");
    const details = {
      name: trimmed,
      address: address.trim() || null,
      identifier: identifier.trim() || null,
    };
    try {
      if (schoolId === null) {
        // Stays open: the teacher and class lists appear for the new school.
        const school = await createMutation.mutateAsync(details);
        setCreated(school);
        setSchoolId(school.id);
        return;
      }
      await updateMutation.mutateAsync({ id: schoolId, ...details });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={schoolId === null ? "Nová škola" : "Upravit školu"}
      className="max-w-2xl"
    >
      <div className="max-h-[calc(100vh-12rem)] overflow-y-auto -mx-5 px-5">
        <form id="school-details" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Název
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresa
              </label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="nepovinné"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IČO / RED-IZO
              </label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nepovinné"
              />
            </div>
          </div>
        </form>

        {school ? (
          <div className="mt-6 space-y-6">
            <p className="text-xs text-gray-500">
              Přidání, úprava i odebrání učitelů a tříd se uloží hned.
            </p>
            <SchoolTeachers school={school} />
            <SchoolClassrooms school={school} />
          </div>
        ) : (
          <p className="mt-4 text-xs text-gray-500">
            Učitele a třídy přidáte hned po založení školy.
          </p>
        )}
      </div>

      {formError && <p className="mt-4 text-sm text-red-500">{formError}</p>}

      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onClose}>
          {school ? "Zavřít" : "Zrušit"}
        </Button>
        <Button
          type="submit"
          form="school-details"
          isLoading={createMutation.isPending || updateMutation.isPending}
        >
          {schoolId === null ? "Založit školu" : "Uložit"}
        </Button>
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Shared bits of the two lists
// ---------------------------------------------------------------------------

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "cs");

function errorText(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  // The team endpoint answers in English; this one is common enough here —
  // someone tries to "invite" a colleague who is already on the team.
  if (err.message === "This user is already a team member.") {
    return "Tento e-mail už patří členovi týmu. Vyberte ho v nabídce „Vybrat existujícího“.";
  }
  return err.message || fallback;
}

function ListHeader({
  title,
  count,
  addLabel,
  onAdd,
}: {
  title: string;
  count: number;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-700">
        {title} <span className="text-gray-400 font-normal">({count})</span>
      </h3>
      <Button type="button" size="sm" variant="secondary" onClick={onAdd}>
        <Plus className="w-4 h-4" />
        {addLabel}
      </Button>
    </div>
  );
}

function ModeSwitch<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            value === o.value
              ? "px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium"
              : "px-2.5 py-1 rounded-md text-gray-600 hover:bg-gray-50"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RowActions({
  editTitle,
  removeTitle,
  onEdit,
  onRemove,
  disabled,
}: {
  editTitle: string;
  removeTitle: string;
  onEdit: () => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        disabled={disabled}
        className="p-1.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
        title={editTitle}
      >
        <Pencil className="w-4 h-4 text-gray-500" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
        title={removeTitle}
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}

const selectClass =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

// ---------------------------------------------------------------------------
// The school's teachers
// ---------------------------------------------------------------------------

function SchoolTeachers({ school }: { school: School }) {
  const { data: team } = useTeam();
  const updateSchool = useUpdateSchool();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const teachers = useMemo(() => [...school.teachers].sort(byName), [school.teachers]);
  const teacherIds = teachers.map((t) => t.id);
  const candidates = useMemo(
    () => teacherCandidates(team ?? [], school.teachers.map((t) => t.id)),
    [team, school.teachers]
  );

  const [adding, setAdding] = useState<"existing" | "new" | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [error, setError] = useState("");

  const busy =
    updateSchool.isPending ||
    createMember.isPending ||
    updateMember.isPending ||
    deleteMember.isPending;

  async function run(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
    setError("");
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorText(err, fallback));
      return false;
    }
  }

  function openAdd() {
    setAdding(adding ? null : candidates.length > 0 ? "existing" : "new");
    setPickedId("");
    setNewName("");
    setNewEmail("");
    setError("");
  }

  async function addExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!pickedId) return;
    const ok = await run(
      () => updateSchool.mutateAsync({ id: school.id, teacher_ids: withId(teacherIds, Number(pickedId)) }),
      "Učitele se nepodařilo přidat"
    );
    if (ok) setAdding(null);
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setError("Vyplňte jméno i e-mail");
      return;
    }
    const ok = await run(
      () =>
        createMember.mutateAsync({
          name: newName.trim(),
          email: newEmail.trim(),
          role: "teacher",
          school_ids: [school.id],
        }),
      "Pozvánku se nepodařilo vytvořit"
    );
    if (ok) setAdding(null);
  }

  function startEdit(t: SchoolTeacher) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditEmail(t.email);
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    if (!editName.trim() || !editEmail.trim()) {
      setError("Vyplňte jméno i e-mail");
      return;
    }
    const ok = await run(
      () => updateMember.mutateAsync({ id: editingId, name: editName.trim(), email: editEmail.trim() }),
      "Změny se nepodařilo uložit"
    );
    if (ok) setEditingId(null);
  }

  async function remove(t: SchoolTeacher) {
    const otherSchools = (team?.find((m) => m.id === t.id)?.schools ?? []).filter(
      (s) => s.id !== school.id
    );
    const { kind, prompt } = teacherRemoval(t, otherSchools);
    if (!confirm(prompt)) return;

    await run(
      () =>
        kind === "demote"
          ? deleteMember.mutateAsync(t.id)
          : updateSchool.mutateAsync({ id: school.id, teacher_ids: withoutId(teacherIds, t.id) }),
      "Učitele se nepodařilo odebrat"
    );
  }

  return (
    <section>
      <ListHeader
        title="Učitelé"
        count={teachers.length}
        addLabel="Přidat učitele"
        onAdd={openAdd}
      />
      <p className="text-xs text-gray-500 mb-2">
        Učitel uvidí v seznamu i ostatní třídy této školy, ale nebude si moci
        zobrazit jejich detail. Odebraný učitel se stane běžným uživatelem
        (žákem).
      </p>

      {adding && (
        <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
          <ModeSwitch
            value={adding}
            onChange={(mode) => {
              setAdding(mode);
              setError("");
            }}
            options={[
              { value: "existing", label: "Vybrat existujícího" },
              { value: "new", label: "Pozvat nového" },
            ]}
          />
          {adding === "existing" ? (
            candidates.length === 0 ? (
              <p className="text-sm text-gray-500">
                Všichni učitelé už u této školy jsou. Nového přidáte přes
                „Pozvat nového“.
              </p>
            ) : (
              <form onSubmit={addExisting} className="flex gap-2">
                <select
                  value={pickedId}
                  onChange={(e) => setPickedId(e.target.value)}
                  className={selectClass}
                  aria-label="Učitel"
                >
                  <option value="">Vyberte učitele…</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.email}
                      {m.schools.length > 0 ? ` (${m.schools.map((s) => s.name).join(", ")})` : ""}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={!pickedId} isLoading={updateSchool.isPending}>
                  Přidat
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={invite} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Jméno"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-500">
                Učiteli přijde pozvánka e-mailem, platí 7 dní. Pokud e-mail už
                patří žákovi, jeho účet se povýší na učitele.
              </p>
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={createMember.isPending}>
                  Pozvat
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {teachers.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Škola zatím nemá žádné učitele.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {teachers.map((t) =>
            editingId === t.id ? (
              <li key={t.id} className="px-3 py-2">
                <form onSubmit={saveEdit} className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Jméno"
                    autoFocus
                  />
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    aria-label="E-mail"
                  />
                  <Button type="submit" size="sm" isLoading={updateMember.isPending}>
                    Uložit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Zrušit
                  </Button>
                </form>
              </li>
            ) : (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-gray-900">{t.name}</span>{" "}
                  <span className="text-xs text-gray-400">{t.email}</span>
                  {t.role === "admin" && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <RowActions
                  editTitle="Upravit jméno a e-mail"
                  removeTitle={t.role === "admin" ? "Odebrat ze školy" : "Odebrat učitele"}
                  onEdit={() => startEdit(t)}
                  onRemove={() => remove(t)}
                  disabled={busy}
                />
              </li>
            )
          )}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// The school's classes
// ---------------------------------------------------------------------------

function SchoolClassrooms({ school }: { school: School }) {
  const { data: classrooms } = useClassrooms();
  const syncClassrooms = useSyncSchoolClassrooms();
  const createClassroom = useCreateClassroom();
  const updateClassroom = useUpdateClassroom();

  const own = useMemo(() => classroomsOf(classrooms ?? [], school.id), [classrooms, school.id]);
  const ownIds = own.map((c) => c.id);
  const candidates = useMemo(
    () => classroomCandidates(classrooms ?? [], school.id),
    [classrooms, school.id]
  );
  const schoolTeachers = useMemo(() => [...school.teachers].sort(byName), [school.teachers]);

  const [adding, setAdding] = useState<"existing" | "new" | null>(null);
  const [pickedId, setPickedId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCount, setNewCount] = useState(25);
  const [newTeacherIds, setNewTeacherIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const busy = syncClassrooms.isPending || createClassroom.isPending || updateClassroom.isPending;

  async function run(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
    setError("");
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorText(err, fallback));
      return false;
    }
  }

  function openAdd() {
    setAdding(adding ? null : candidates.length > 0 ? "existing" : "new");
    setPickedId("");
    setNewName("");
    setNewCount(25);
    setNewTeacherIds([]);
    setError("");
  }

  async function addExisting(e: React.FormEvent) {
    e.preventDefault();
    const picked = candidates.find((c) => String(c.id) === pickedId);
    if (!picked) return;
    if (
      picked.school &&
      !confirm(`Třída ${picked.name} je teď u školy ${picked.school.name}. Přesunout ji sem?`)
    ) {
      return;
    }
    const ok = await run(
      () => syncClassrooms.mutateAsync({ id: school.id, classroomIds: withId(ownIds, picked.id) }),
      "Třídu se nepodařilo přidat"
    );
    if (ok) setAdding(null);
  }

  async function createNew(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      setError("Zadejte název třídy");
      return;
    }
    if (newCount < 1 || newCount > 50) {
      setError("Počet žáků musí být 1–50");
      return;
    }
    const ok = await run(
      () =>
        createClassroom.mutateAsync({
          name: newName.trim(),
          students: generateStudents(newCount),
          teacher_ids: newTeacherIds.length > 0 ? newTeacherIds : undefined,
          school_id: school.id,
        }),
      "Třídu se nepodařilo založit"
    );
    if (ok) setAdding(null);
  }

  function startEdit(c: Classroom) {
    setEditingId(c.id);
    setEditName(c.name);
    setError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    if (!editName.trim()) {
      setError("Zadejte název třídy");
      return;
    }
    const ok = await run(
      () => updateClassroom.mutateAsync({ id: editingId, name: editName.trim() }),
      "Změny se nepodařilo uložit"
    );
    if (ok) setEditingId(null);
  }

  async function remove(c: Classroom) {
    if (
      !confirm(
        `Vyřadit třídu ${c.name} ze školy ${school.name}? Třída se žáky zůstane zachovaná v seznamu Třídy, jen bez školy.`
      )
    ) {
      return;
    }
    await run(
      () => syncClassrooms.mutateAsync({ id: school.id, classroomIds: withoutId(ownIds, c.id) }),
      "Třídu se nepodařilo odebrat"
    );
  }

  function toggleNewTeacher(id: number) {
    setNewTeacherIds((prev) => (prev.includes(id) ? withoutId(prev, id) : withId(prev, id)));
  }

  return (
    <section>
      <ListHeader title="Třídy" count={own.length} addLabel="Přidat třídu" onAdd={openAdd} />

      {adding && (
        <div className="mb-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-3">
          <ModeSwitch
            value={adding}
            onChange={(mode) => {
              setAdding(mode);
              setError("");
            }}
            options={[
              { value: "existing", label: "Vybrat existující" },
              { value: "new", label: "Založit novou" },
            ]}
          />
          {adding === "existing" ? (
            candidates.length === 0 ? (
              <p className="text-sm text-gray-500">
                Všechny třídy už u této školy jsou. Novou přidáte přes
                „Založit novou“.
              </p>
            ) : (
              <form onSubmit={addExisting} className="flex gap-2">
                <select
                  value={pickedId}
                  onChange={(e) => setPickedId(e.target.value)}
                  className={selectClass}
                  aria-label="Třída"
                >
                  <option value="">Vyberte třídu…</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.school ? ` (nyní: ${c.school.name})` : ""}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" disabled={!pickedId} isLoading={syncClassrooms.isPending}>
                  Přidat
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={createNew} className="space-y-2">
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Název třídy</span>
                  <Input
                    placeholder="např. 5.B Matematika"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-500 mb-1">Počet žáků</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={newCount}
                    onChange={(e) => setNewCount(Number(e.target.value))}
                  />
                </label>
              </div>
              {schoolTeachers.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Učí:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {schoolTeachers.map((t) => (
                      <label key={t.id} className="flex items-center gap-1.5 text-sm text-gray-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newTeacherIds.includes(t.id)}
                          onChange={() => toggleNewTeacher(t.id)}
                          className="rounded border-gray-300"
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Žákovské účty se založí podle zadaného počtu. Pokud nevyberete
                učitele, budete třídu učit vy.
              </p>
              <div className="flex justify-end">
                <Button type="submit" size="sm" isLoading={createClassroom.isPending}>
                  Založit třídu
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {own.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">Škola zatím nemá žádné třídy.</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {own.map((c) =>
            editingId === c.id ? (
              <li key={c.id} className="px-3 py-2">
                <form onSubmit={saveEdit} className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    aria-label="Název třídy"
                    autoFocus
                  />
                  <Button type="submit" size="sm" isLoading={updateClassroom.isPending}>
                    Uložit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Zrušit
                  </Button>
                </form>
              </li>
            ) : (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  {/* Students, courses and the class code live in the class
                      detail; the list here only names and files the class. */}
                  <Link
                    href={`/admin/users?tab=classrooms&classroom=${c.id}`}
                    className="text-sm text-gray-900 hover:text-blue-600 hover:underline"
                  >
                    {c.name}
                  </Link>{" "}
                  <span className="text-xs text-gray-400">
                    {c.students_count} {pluralCs(c.students_count, "žák", "žáci", "žáků")}
                  </span>
                </div>
                <RowActions
                  editTitle="Přejmenovat třídu"
                  removeTitle="Odebrat třídu ze školy"
                  onEdit={() => startEdit(c)}
                  onRemove={() => remove(c)}
                  disabled={busy}
                />
              </li>
            )
          )}
        </ul>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </section>
  );
}
