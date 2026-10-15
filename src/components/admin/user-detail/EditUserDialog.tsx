"use client";

import { useMemo, useState } from "react";
import { useUpdateUser } from "@/hooks/useUsers";
import { useClassrooms } from "@/hooks/useClassrooms";
import { useSchools } from "@/hooks/useSchools";
import { useAuth } from "@/hooks/useAuth";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { schoolOptions } from "@/lib/school-filter";
import { schoolIdsOfClasses, type PickableClass } from "@/lib/user-school-classes";
import { SchoolClassPicker } from "./SchoolClassPicker";

const TEAM_SCHOOL_HINT: Record<string, string> = {
  teacher:
    "Učitel uvidí v seznamu i ostatní třídy těchto škol, ale nebude si moci zobrazit jejich detail.",
  admin: "Admin vidí všechny třídy i bez přiřazení; škola ho zařadí v seznamech a rozesílkách.",
};
const STUDENT_SCHOOL_HINT =
  "Žák patří ke škole přes své třídy — výběr školy jen určí, které třídy se nabídnou.";

/**
 * Mounted only while open (UserDetailPanel), so every opening starts from
 * the user as they are now.
 */
export function EditUserDialog({
  user,
  onClose,
}: {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    classroom_ids: number[];
    school_ids: number[];
    teaching_classroom_ids: number[];
  };
  onClose: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role || "student");
  const [classroomIds, setClassroomIds] = useState<number[]>(user.classroom_ids);
  const [schoolIds, setSchoolIds] = useState<number[]>(user.school_ids);
  const [teachingIds, setTeachingIds] = useState<number[]>(user.teaching_classroom_ids);
  // A pupil's schools are not stored, only read off their classes; null until
  // the admin touches step one, so it can follow the class list as it loads.
  const [studentSchoolPick, setStudentSchoolPick] = useState<number[] | null>(null);
  const [formError, setFormError] = useState("");
  const updateMutation = useUpdateUser();
  const { data: classrooms, isLoading: classroomsLoading } = useClassrooms();
  const { data: allSchools, isLoading: schoolsLoading } = useSchools();
  const { isAdmin } = useAuth();

  // A teacher or admin is filed under schools and teaches classes (BR-R84FVD,
  // BR-QKCBCT); both are admin decisions. Anyone else — and anything a
  // teacher edits — is a pupil sitting in classes.
  const teamMode = isAdmin && role !== "student";

  const classes: PickableClass[] = useMemo(
    () => (classrooms ?? []).map((c) => ({ id: c.id, name: c.name, school: c.school ?? null })),
    [classrooms]
  );
  // A teacher cannot read /admin/schools; the schools their class list
  // mentions are the ones they can pick from.
  const schools = useMemo(
    () => (isAdmin ? allSchools ?? [] : schoolOptions(classes.map((c) => (c.school ? [c.school] : [])))),
    [isAdmin, allSchools, classes]
  );

  const studentSchoolIds = studentSchoolPick ?? schoolIdsOfClasses(classes, classroomIds);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    try {
      await updateMutation.mutateAsync({
        id: user.id,
        name,
        email: email || null,
        classroom_ids: classroomIds,
        role: role as "student" | "teacher" | "admin",
        school_ids: teamMode ? schoolIds : undefined,
        teaching_classroom_ids: teamMode ? teachingIds : undefined,
      });
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Chyba při ukládání");
    }
  };

  return (
    <Dialog open onClose={onClose} title="Upravit uživatele" className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Přezdívka"
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
        </div>
        {teamMode ? (
          <SchoolClassPicker
            key="team"
            schools={schools}
            schoolsLoading={schoolsLoading}
            schoolIds={schoolIds}
            onSchoolIdsChange={setSchoolIds}
            schoolHint={TEAM_SCHOOL_HINT[role] ?? ""}
            classes={classes}
            classIds={teachingIds}
            onClassIdsChange={setTeachingIds}
            classHint="Třídy, které učí. Změna škol přiřazené třídy sama neodebere."
          />
        ) : (
          <SchoolClassPicker
            key="student"
            schools={schools}
            schoolsLoading={isAdmin ? schoolsLoading : classroomsLoading}
            schoolIds={studentSchoolIds}
            onSchoolIdsChange={setStudentSchoolPick}
            schoolHint={STUDENT_SCHOOL_HINT}
            classes={classes}
            classIds={classroomIds}
            onClassIdsChange={setClassroomIds}
            classHint="Třídy, do kterých chodí. Změna škol přiřazené třídy sama neodebere."
          />
        )}
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
