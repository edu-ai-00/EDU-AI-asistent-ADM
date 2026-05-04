"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Copy,
  FileSpreadsheet,
  Printer,
  Trash2,
  Users,
  Check,
  AlertCircle,
  Pencil,
  Search,
  ChevronRight,
  UserPlus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  useClassrooms,
  useClassroom,
  useCreateClassroom,
  useUpdateClassroom,
  useDeleteClassroom,
  useAddStudents,
} from "@/hooks/useClassrooms";
import { useTeam } from "@/hooks/useTeam";
import { generateStudents, classroomToText, classroomToCsv } from "@/lib/classroom";
import { CreateClassModal } from "./CreateClassModal";
import { EditClassroomModal } from "./EditClassroomModal";
import { AddStudentsModal } from "./AddStudentsModal";
import { ClassroomCoursesSection } from "./ClassroomCoursesSection";
import { ClassroomTeachersSection } from "./ClassroomTeachersSection";
import { ClassroomSkillsSection } from "./ClassroomSkillsSection";
import type { Classroom, ClassStudent } from "@/types/classroom";

// ---------------------------------------------------------------------------
// ClassroomList
// ---------------------------------------------------------------------------

function ClassroomList({
  classrooms,
  onSelect,
  onNewClick,
}: {
  classrooms: Classroom[];
  onSelect: (c: Classroom) => void;
  onNewClick: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return classrooms;
    const q = searchQuery.toLowerCase();
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.teachers?.some((t) => t.name.toLowerCase().includes(q))
    );
  }, [classrooms, searchQuery]);

  return (
    <div>
      {/* Search + Create */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Hledat třídu podle názvu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onNewClick}>
          <Plus className="w-4 h-4" />
          Nová třída
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          {searchQuery ? (
            <p className="text-gray-600">Žádné třídy neodpovídají hledání</p>
          ) : (
            <>
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">Zatím žádné třídy</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Třída</th>
                <th className="px-4 py-3">Učitelé</th>
                <th className="px-4 py-3 text-center">Žáků</th>
                <th className="px-4 py-3">Vytvořeno</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{c.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.teachers && c.teachers.length > 0
                      ? c.teachers.map((t) => t.name).join(", ")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {c.students_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("cs-CZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
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

// ---------------------------------------------------------------------------
// ClassroomDetail
// ---------------------------------------------------------------------------

function ClassroomDetail({
  classroomId,
  onBack,
  onEdit,
  onAddStudents,
}: {
  classroomId: number;
  onBack: () => void;
  onEdit: () => void;
  onAddStudents: () => void;
}) {
  const { data: classroom, isLoading, error } = useClassroom(classroomId);
  const deleteMutation = useDeleteClassroom();
  const [copied, setCopied] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeSubTab = searchParams.get("subtab") ?? "students";

  const setSubTab = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("subtab", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  if (isLoading) {
    return <LoadingPage message="Načítání třídy..." />;
  }

  if (error || !classroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst třídu</p>
        <Button variant="secondary" onClick={onBack}>
          Zpět
        </Button>
      </div>
    );
  }

  const students = classroom.students ?? [];
  const teachers = classroom.teachers ?? [];

  function handleDelete() {
    deleteMutation.mutate(classroomId, {
      onSuccess: () => onBack(),
    });
  }

  return (
    <div>
      {/* Print-only title (hidden on screen) */}
      <div data-print-title className="hidden">
        <h1 className="text-2xl font-bold mb-1">{classroom.name}</h1>
        <p className="text-sm text-gray-600 mb-4">
          {students.length} žáků &middot;{" "}
          {new Date(classroom.created_at).toLocaleDateString("cs-CZ", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4" data-print-hide>
        <button
          onClick={onBack}
          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {classroom.name}
          </h2>
          <p className="text-sm text-gray-500">
            {students.length} žáků
            {" "}&middot;{" "}
            {new Date(classroom.created_at).toLocaleDateString("cs-CZ", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAddStudents}>
          <UserPlus className="w-3.5 h-3.5" />
          Přidat žáky
        </Button>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" />
          Upravit
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          isLoading={deleteMutation.isPending}
        >
          <Trash2 className="w-4 h-4" />
          Smazat
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeSubTab} onValueChange={setSubTab} data-print-hide>
        <TabsList className="mb-4">
          <TabsTrigger value="students">Žáci</TabsTrigger>
          <TabsTrigger value="teachers">Učitelé</TabsTrigger>
          <TabsTrigger value="courses">Kurzy</TabsTrigger>
          <TabsTrigger value="skills">Dovednosti</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          {/* Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                copyToClipboard(classroomToText(classroom), "text")
              }
            >
              {copied === "text" ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied === "text" ? "Zkopírováno!" : "Kopírovat kódy"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                copyToClipboard(classroomToCsv(classroom), "csv")
              }
            >
              {copied === "csv" ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {copied === "csv" ? "Zkopírováno!" : "Kopírovat CSV"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              Tisknout
            </Button>
          </div>

          {/* Student table */}
          <div data-print-table className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 w-12">#</th>
                  <th className="px-4 py-3">Jméno</th>
                  <th className="px-4 py-3">Kód</th>
                  <th className="px-4 py-3 text-center">Level</th>
                  <th className="px-4 py-3 text-center">Kurzy</th>
                  <th className="px-4 py-3 text-center">XP</th>
                  <th className="px-4 py-3">Poslední aktivita</th>
                  <th className="px-4 py-3 w-10" data-print-hide />
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <StudentRow
                    key={s.id}
                    student={s}
                    index={i}
                    copied={copied}
                    onCopy={(code) => copyToClipboard(code, code)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="teachers">
          <ClassroomTeachersSection
            classroomId={classroomId}
            teachers={teachers}
          />
        </TabsContent>

        <TabsContent value="courses">
          <ClassroomCoursesSection classroomId={classroomId} />
        </TabsContent>

        <TabsContent value="skills">
          <ClassroomSkillsSection classroomId={classroomId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StudentRow({
  student,
  index,
  copied,
  onCopy,
}: {
  student: ClassStudent;
  index: number;
  copied: string | null;
  onCopy: (code: string) => void;
}) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-2.5 text-sm text-gray-500">{index + 1}</td>
      <td className="px-4 py-2.5">
        <div className="text-sm font-medium text-gray-900">{student.name}</div>
        {student.email && (
          <div className="text-xs text-gray-500">{student.email}</div>
        )}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs tracking-wider text-gray-600">
        {student.login_code}
      </td>
      <td className="px-4 py-2.5 text-center">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {student.stats?.level ?? 1}
        </span>
      </td>
      <td className="px-4 py-2.5 text-center text-sm">
        {student.courses_count != null ? (
          <>
            <span className="text-green-600 font-medium">{student.completed_count ?? 0}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-700">{student.courses_count}</span>
          </>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center text-sm text-gray-700">
        {student.stats?.xp_points?.toLocaleString() ?? 0}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-500">
        {formatRelativeTime(student.last_active_at)}
      </td>
      <td className="px-4 py-2.5" data-print-hide>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCopy(student.login_code)}
            className="p-1 rounded hover:bg-gray-200 transition-colors"
            title="Kopírovat kód"
          >
            {copied === student.login_code ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
          <a
            href={`/admin/users/${student.id}`}
            className="p-1 rounded hover:bg-blue-50 transition-colors"
            title="Zobrazit profil"
          >
            <Eye className="w-3.5 h-3.5 text-blue-500" />
          </a>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// ClassroomSection (exported orchestrator)
// ---------------------------------------------------------------------------

export function ClassroomSection() {
  const { data: classrooms, isLoading, error } = useClassrooms();
  const { data: teamMembers } = useTeam();
  const createMutation = useCreateClassroom();
  const updateMutation = useUpdateClassroom();
  const addStudentsMutation = useAddStudents();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const classroomParam = searchParams.get("classroom");
  const selectedId = classroomParam ? parseInt(classroomParam, 10) : null;

  const setSelectedId = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id !== null) {
        params.set("classroom", String(id));
        params.delete("subtab");
      } else {
        params.delete("classroom");
        params.delete("subtab");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddStudentsModalOpen, setIsAddStudentsModalOpen] = useState(false);

  const teachers = teamMembers ?? [];

  function handleCreate(name: string, count: number, teacherIds: number[]) {
    const students = generateStudents(count);
    createMutation.mutate(
      {
        name,
        students,
        teacher_ids: teacherIds.length > 0 ? teacherIds : undefined,
      },
      {
        onSuccess: (created) => {
          setIsCreateModalOpen(false);
          setSelectedId(created.id);
        },
      }
    );
  }

  function handleUpdate(name: string) {
    if (selectedId === null) return;
    updateMutation.mutate(
      { id: selectedId, name },
      {
        onSuccess: () => {
          setIsEditModalOpen(false);
        },
      }
    );
  }

  function handleAddStudents(count: number) {
    if (selectedId === null) return;
    const students = generateStudents(count);
    addStudentsMutation.mutate(
      { classroomId: selectedId, students },
      {
        onSuccess: () => {
          setIsAddStudentsModalOpen(false);
        },
      }
    );
  }

  // Get the selected classroom from the list data (for EditModal pre-fill)
  const selectedClassroom = classrooms?.find((c) => c.id === selectedId);

  if (selectedId !== null) {
    return (
      <>
        <ClassroomDetail
          classroomId={selectedId}
          onBack={() => setSelectedId(null)}
          onEdit={() => setIsEditModalOpen(true)}
          onAddStudents={() => setIsAddStudentsModalOpen(true)}
        />

        {selectedClassroom && (
          <EditClassroomModal
            isOpen={isEditModalOpen}
            classroom={selectedClassroom}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleUpdate}
            isLoading={updateMutation.isPending}
          />
        )}

        <AddStudentsModal
          isOpen={isAddStudentsModalOpen}
          onClose={() => setIsAddStudentsModalOpen(false)}
          onAdd={handleAddStudents}
          isLoading={addStudentsMutation.isPending}
          classroomName={selectedClassroom?.name ?? ""}
        />
      </>
    );
  }

  if (isLoading) {
    return <LoadingPage message="Načítání tříd..." />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">Nepodařilo se načíst třídy</p>
      </div>
    );
  }

  return (
    <div>
      <ClassroomList
        classrooms={classrooms ?? []}
        onSelect={(c) => setSelectedId(c.id)}
        onNewClick={() => setIsCreateModalOpen(true)}
      />

      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
        isLoading={createMutation.isPending}
        teachers={teachers}
      />
    </div>
  );
}
